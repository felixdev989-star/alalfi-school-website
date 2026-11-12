"""
Secure deploy for Cloudflare Pages (AlAlfi school website).

- Stages ONLY the public site files into a temp folder (no dev scripts,
  no .git, no wrangler.toml) so they are never publicly downloadable.
- Uploads via wrangler pages deploy (with the D1 + KV bindings).
- Verifies the bindings + publish secret afterwards.

Usage:
  python deploy_cloudflare.py <API_TOKEN> [ACCOUNT_ID] [PROJECT]
"""
import os, sys, shutil, subprocess, json, urllib.request, urllib.error, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
API = "https://api.cloudflare.com/client/v4"
KV_ID = "14df389d3ff14aa095c769362d2965cc"
D1_ID = "5b9ee32e-f76b-4aa3-afe1-a9b345ac78fa"
D1_NAME = "alalfi-db"

# files/folders that must NEVER be published
EXCLUDE_NAMES = {
    ".git", ".wrangler", "node_modules", "__pycache__", ".vscode", ".idea",
    ".gitignore", "deploy.bat", "deploy_cloudflare.py", "deploy_github.py",
    "ensure_cloudflare.py", "make_pptx.py", "seed_db.py", "wrangler.toml",
    "logo-original.png",
    # never publish the database schema / seed data
    "db", "schema.sql", "seed-content.json", "schema-login.sql",
    # the Pages Functions are uploaded separately (see stage()), never as static files
    "functions",
}
EXCLUDE_EXT = {".pyc", ".log", ".tmp", ".zip", ".bak"}


def stage():
    """Return (staging_root, site_dir) containing only publishable files."""
    root = tempfile.mkdtemp(prefix="alalfi-site-")
    site = os.path.join(root, "site")
    os.makedirs(site, exist_ok=True)

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_NAMES]
        rel_dir = os.path.relpath(dirpath, ROOT)
        if rel_dir == ".":
            rel_dir = ""
        for fn in filenames:
            if fn in EXCLUDE_NAMES:
                continue
            ext = os.path.splitext(fn)[1].lower()
            if ext in EXCLUDE_EXT:
                continue
            src = os.path.join(dirpath, fn)
            dst = os.path.join(site, rel_dir, fn) if rel_dir else os.path.join(site, fn)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)

    # Pages Functions live at the PROJECT ROOT (next to wrangler.toml)
    fn_src = os.path.join(ROOT, "functions")
    if os.path.isdir(fn_src):
        shutil.copytree(fn_src, os.path.join(root, "functions"), dirs_exist_ok=True)

    # wrangler config lives OUTSIDE the uploaded folder -> never public
    with open(os.path.join(root, "wrangler.toml"), "w", encoding="utf-8") as f:
        f.write(
            'name = "alalfi-school"\n'
            'compatibility_date = "2026-11-10"\n'
            'pages_build_output_dir = "site"\n\n'
            '[[d1_databases]]\n'
            'binding = "ALALFI_DB"\n'
            f'database_name = "{D1_NAME}"\n'
            f'database_id = "{D1_ID}"\n\n'
            '[[kv_namespaces]]\n'
            'binding = "CONTENT"\n'
            f'id = "{KV_ID}"\n'
        )
    return root, site


PANEL_PROJECT = "alalfi-panel"


def stage_panel():
    """A second staging folder: the admin panel lives on its OWN origin
    (alalfi-panel.pages.dev) so the home-screen app is never merged with the
    public school site."""
    root = tempfile.mkdtemp(prefix="alalfi-panel-")
    site = os.path.join(root, "site")
    os.makedirs(site, exist_ok=True)

    # the assets the panel needs
    for name in ("css", "js", "fonts"):
        src = os.path.join(ROOT, name)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(site, name), dirs_exist_ok=True)
    # the images (the panel shows previews + the logo)
    src_img = os.path.join(ROOT, "images")
    if os.path.isdir(src_img):
        shutil.copytree(src_img, os.path.join(site, "images"), dirs_exist_ok=True)

    # the panel page + its own manifest
    os.makedirs(os.path.join(site, "panel"), exist_ok=True)
    for f in ("index.html", "manifest.webmanifest"):
        p = os.path.join(ROOT, "panel", f)
        if os.path.isfile(p):
            shutil.copy2(p, os.path.join(site, "panel", f))

    # the security headers
    for f in ("_headers",):
        p = os.path.join(ROOT, f)
        if os.path.isfile(p):
            shutil.copy2(p, os.path.join(site, f))

    # the functions (the API + the panel gate)
    fn_src = os.path.join(ROOT, "functions")
    if os.path.isdir(fn_src):
        shutil.copytree(fn_src, os.path.join(root, "functions"), dirs_exist_ok=True)

    with open(os.path.join(root, "wrangler.toml"), "w", encoding="utf-8") as f:
        f.write(
            f'name = "{PANEL_PROJECT}"\n'
            'compatibility_date = "2026-11-10"\n'
            'pages_build_output_dir = "site"\n\n'
            '[[d1_databases]]\n'
            'binding = "ALALFI_DB"\n'
            f'database_name = "{D1_NAME}"\n'
            f'database_id = "{D1_ID}"\n\n'
            '[[kv_namespaces]]\n'
            'binding = "CONTENT"\n'
            f'id = "{KV_ID}"\n'
        )
    return root, site

def api(method, path, token, body=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return {"success": False, "err": e.read().decode("utf-8", "replace")[:200]}


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    token = sys.argv[1]
    account = sys.argv[2] if len(sys.argv) > 2 else "78b027e0bbc93bc080113f41d3cd49e8"
    project = sys.argv[3] if len(sys.argv) > 3 else "alalfi-school"

    print("==> staging public files (dev scripts excluded)")
    root, site = stage()
    n = sum(len(f) for _, _, f in os.walk(site))
    print(f"    {n} files staged")

    print("==> deploying to Cloudflare Pages")
    wrangler = os.path.join(os.environ.get("APPDATA", ""), "npm", "node_modules", "wrangler", "bin", "wrangler.js")
    env = dict(os.environ, CLOUDFLARE_API_TOKEN=token)
    p = subprocess.run(
        f'node "{wrangler}" pages deploy site --project-name {project} --branch main --commit-dirty=true',
        cwd=root, capture_output=True, text=True, shell=True, env=env,
        encoding="utf-8", errors="replace")
    tail = (p.stdout or "").strip().splitlines()
    print("   ", tail[-1] if tail else (p.stderr or "")[:200])

    print("==> verifying bindings")
    r = api("GET", f"/accounts/{account}/pages/projects/{project}", token)
    cfg = (r.get("result") or {}).get("deployment_configs") or {}
    prod = cfg.get("production") or {}
    kv = prod.get("kv_namespaces") or {}
    d1 = prod.get("d1_databases") or {}
    print(f"    D1 binding : {'OK' if 'ALALFI_DB' in d1 else 'MISSING'}")
    print(f"    KV binding : {'OK' if 'CONTENT' in kv else 'MISSING'}")
    print(f"    secret     : {'present' if 'EDIT_TOKEN' in (prod.get('env_vars') or {}) else 'MISSING'}")

    shutil.rmtree(root, ignore_errors=True)
    print(f"\n==> live: https://{project}.pages.dev")

    # ---------------- the panel (its own origin) ----------------
    print("==> staging the panel (separate origin)")
    proot, psite = stage_panel()
    print(f"    {sum(len(f) for _, _, f in os.walk(psite))} files staged")
    p = subprocess.run(
        f'node "{wrangler}" pages deploy site --project-name {PANEL_PROJECT} --branch main --commit-dirty=true',
        cwd=proot, capture_output=True, text=True, shell=True, env=env,
        encoding="utf-8", errors="replace")
    tail = (p.stdout or "").strip().splitlines()
    print("   ", tail[-1] if tail else (p.stderr or "")[:200])
    shutil.rmtree(proot, ignore_errors=True)
    print(f"==> panel: https://{PANEL_PROJECT}.pages.dev/panel/")



if __name__ == "__main__":
    main()
