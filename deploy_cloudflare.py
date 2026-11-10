"""
Deploy the school website to Cloudflare Pages via the REST API (direct upload).

Usage:
  python deploy_cloudflare.py <ACCOUNT_ID> <API_TOKEN> [PROJECT_NAME]

Create the token at:
  https://dash.cloudflare.com/profile/api-tokens
  -> Create Token -> Edit Cloudflare Workers -> Account -> Cloudflare Pages -> Edit
"""
import os, sys, json, hashlib, mimetypes, urllib.request, urllib.error, time, mimetypes

API = "https://api.cloudflare.com/client/v4"
ROOT = os.path.dirname(os.path.abspath(__file__))

SKIP_NAMES = {".git", "node_modules", ".wrangler", ".gitignore", ".DS_Store", "Thumbs.db", "desktop.ini"}
SKIP_EXT = {".log", ".tmp", ".zip"}
MAX_FILE_BYTES = 25 * 1024 * 1024


def api(method, path, token, body=None, content_type=None, raw=False):
    url = API + path
    data = None
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            payload = r.read()
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        print(f"HTTP {e.code} {method} {path}\n{detail[:800]}")
        sys.exit(1)


def collect_files(root):
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_NAMES]
        for fn in filenames:
            if fn in SKIP_NAMES or fn.startswith("_") and fn.endswith(".html"):
                continue
            ext = os.path.splitext(fn)[1].lower()
            if ext in SKIP_EXT:
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root).replace("\\", "/")
            size = os.path.getsize(full)
            if size > MAX_FILE_BYTES:
                print(f"  skip (too big) {rel} {size}")
                continue
            files.append((rel, full, size))
    return files


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    token = sys.argv[1]
    project = sys.argv[2] if len(sys.argv) > 2 else "alalfi-school"

    # discover account id automatically
    print("==> discovering Cloudflare account")
    accs = api("GET", "/accounts?per_page=20", token)
    if not accs.get("success") or not accs.get("result"):
        print("Could not list accounts. Check the token permissions.")
        sys.exit(1)
    accounts = accs["result"]
    if len(accounts) == 1:
        account_id = accounts[0]["id"]
        print(f"    account: {accounts[0]['name']} ({account_id})")
    else:
        for i, a in enumerate(accounts, 1):
            print(f"    [{i}] {a['name']}  ({a['id']})")
        pick = input("    choose account number: ").strip()
        account_id = accounts[int(pick) - 1]["id"]

    # 1. ensure project exists
    print(f"==> checking project '{project}'")
    r = api("GET", f"/accounts/{account_id}/pages/projects/{project}", token)
    if not r.get("success"):
        print("    creating project...")
        r = api("POST", f"/accounts/{account_id}/pages/projects", token,
                {"name": project, "production_branch": "main"})
        if not r.get("success"):
            print("FAILED to create project:", json.dumps(r)[:400])
            sys.exit(1)
    print("    OK project ready")

    files = collect_files(ROOT)
    total = sum(s for _, _, s in files)
    print(f"==> uploading {len(files)} files ({total/1024:.0f} KB)")

    # 2. build manifest
    manifest_files = {}
    for rel, full, size in files:
        with open(full, "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()
        manifest_files[rel] = {"hash": h}
    manifest = json.dumps({"files": manifest_files, "redirects": [], "headers": {}})

    # 3. multipart upload
    boundary = "----alalfi" + hashlib.md5(str(time.time()).encode()).hexdigest()
    parts = []

    def add_field(name, value):
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n".encode() + value.encode() + b"\r\n")

    add_field("manifest", manifest)
    for rel, full, size in files:
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        head = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{rel}\"; filename=\"{os.path.basename(rel)}\"\r\n"
                f"Content-Type: {ctype}\r\n\r\n").encode()
        with open(full, "rb") as f:
            parts.append(head + f.read() + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(parts)

    url = f"{API}/accounts/{account_id}/pages/projects/{project}/deployments"
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    })
    print("    uploading...")
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            res = json.loads(r.read())
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode("utf-8", "replace")[:800])
        sys.exit(1)

    if not res.get("success"):
        print("FAILED:", json.dumps(res)[:600])
        sys.exit(1)

    d = res["result"]
    print("\n=== DEPLOYED ===")
    print("URL:", d.get("url"))
    print("Deployment:", d.get("id"))
    for alias in (d.get("deployment_trigger") or {},).items():
        pass
    aliases = d.get("aliases") or []
    for a in aliases:
        print("Alias:", a)
    print("\nOpen:", d.get("url"))


if __name__ == "__main__":
    main()
