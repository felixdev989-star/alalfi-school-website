"""
Seed the D1 database: create the superadmin account and the initial content.
Passwords are hashed with SHA-256 + a random salt (same scheme as the API).

Usage:
  python seed_db.py <PASSWORD> [USERNAME] [NAME]
"""
import sys, os, json, hashlib, secrets, subprocess, tempfile

DB = "alalfi-db"
ROOT = os.path.dirname(os.path.abspath(__file__))
WRANGLER = os.path.join(os.environ.get("APPDATA", ""), "npm", "node_modules", "wrangler", "bin", "wrangler.js")


def d1_file(sql_text):
    """Execute a SQL script through wrangler (avoids shell quoting issues)."""
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
        raise RuntimeError((p.stderr or p.stdout)[-600:])
    return p.stdout


def d1(sql_text):
    return d1_file(sql_text)


def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    password = sys.argv[1]
    username = sys.argv[2] if len(sys.argv) > 2 else "admin"
    name = sys.argv[3] if len(sys.argv) > 3 else "المدير العام"

    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + "::" + password).encode()).hexdigest()

    print(f"==> creating superadmin '{username}'")
    d1("DELETE FROM sessions;\nDELETE FROM users;")
    d1("INSERT INTO users (username, name, role, device, perms, password_hash, salt) "
       f"VALUES ({esc(username)}, {esc(name)}, 'superadmin', {esc('جهاز المدير العام')}, '{{}}', {esc(h)}, {esc(salt)});")
    print("    done")

    print("==> seeding content")
    with open(os.path.join(ROOT, "db", "seed-content.json"), encoding="utf-8") as f:
        content = json.load(f)
    stmts = ["DELETE FROM content;"]
    for key, value in content.items():
        stmts.append("INSERT OR REPLACE INTO content (key, value, updated_at) VALUES ("
                     f"{esc(key)}, {esc(json.dumps(value, ensure_ascii=False))}, datetime('now'));")
    d1("\n".join(stmts))
    print(f"    {len(content)} collections")

    out = d1("SELECT id, username, role, device FROM users;")
    print("==> users:", out[-300:])


if __name__ == "__main__":
    main()
