import os, json, subprocess, hashlib, secrets, tempfile, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DB = "alalfi-db"
WRANGLER = os.path.join(os.environ.get("APPDATA", ""), "npm", "node_modules", "wrangler", "bin", "wrangler.js")


def d1(sql_text):
    fd, path = tempfile.mkstemp(suffix=".sql")
    os.close(fd)
    with open(path, "w", encoding="utf-8") as f:
        f.write(sql_text)
    cmd = f'node "{WRANGLER}" d1 execute {DB} --remote --file "{path}"'
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, shell=True,
                       encoding="utf-8", errors="replace",
                       env=dict(os.environ, CLOUDFLARE_API_TOKEN=os.environ.get("CLOUDFLARE_API_TOKEN", "")))
    try:
        os.remove(path)
    except Exception:
        pass
    if p.returncode != 0:
        raise RuntimeError((p.stderr or p.stdout)[-700:])
    return p.stdout


def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def migrate():
    """Add missing columns to the users table (D1 has no ADD COLUMN IF NOT EXISTS)."""
    print("==> migrating users table")
    wanted = {
        "slug": "TEXT",
        "device_id": "TEXT",
        "device_info": "TEXT NOT NULL DEFAULT ''",
    }
    for col, typ in wanted.items():
        try:
            d1(f"ALTER TABLE users ADD COLUMN {col} {typ};")
            print(f"    + {col}")
        except Exception as e:
            print(f"    = {col} (already there)")
    try:
        d1("CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);")
    except Exception:
        pass


def main():
    if len(sys.argv) < 2:
        print("Usage: python seed_db.py <PASSWORD> [username] [name] [slug]")
        print("  (no default password - always give your own)")
        sys.exit(1)
    password = sys.argv[1]
    username = sys.argv[2] if len(sys.argv) > 2 else "admin"
    name = sys.argv[3] if len(sys.argv) > 3 else "المدير العام"
    slug = sys.argv[4] if len(sys.argv) > 4 else "admin"

    print("==> applying schema (adds slug + user_devices)")
    with open(os.path.join(ROOT, "db", "schema.sql"), encoding="utf-8") as f:
        d1(f.read())
    migrate()

    salt = secrets.token_hex(16)
    # PBKDF2-HMAC-SHA256 (120k rounds) - same format the server verifies
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
    h = f"pbkdf2$100000${salt}${dk.hex()}"

    print(f"==> creating superadmin '{username}' (slug: {slug})")
    d1("DELETE FROM sessions;")
    d1("DELETE FROM user_devices;")
    d1("DELETE FROM users;")
    d1("INSERT INTO users (username, slug, name, role, device, perms, password_hash, salt) "
       f"VALUES ({esc(username)}, {esc(slug)}, {esc(name)}, 'superadmin', {esc('جهاز المدير العام')}, '{{}}', {esc(h)}, {esc(salt)});")

    print("==> seeding content")
    with open(os.path.join(ROOT, "db", "seed-content.json"), encoding="utf-8") as f:
        content = json.load(f)
    stmts = ["DELETE FROM content;"]
    for key, value in content.items():
        stmts.append("INSERT OR REPLACE INTO content (key, value, updated_at) VALUES ("
                     f"{esc(key)}, {esc(json.dumps(value, ensure_ascii=False))}, datetime('now'));")
    d1("\n".join(stmts))
    print(f"    {len(content)} collections")
    print("DONE")


if __name__ == "__main__":
    main()
