"""
Ensure the Cloudflare Pages project has the KV binding + publish secret.

Usage: python ensure_cloudflare.py <API_TOKEN> <ACCOUNT_ID> <PROJECT_NAME>
"""
import sys, json, urllib.request, urllib.error

API = "https://api.cloudflare.com/client/v4"
KV_ID = "14df389d3ff14aa095c769362d2965cc"
KV_BINDING = "CONTENT"
SECRET_NAME = "EDIT_TOKEN"


def api(method, path, token, body=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} {method} {path}: {e.read().decode('utf-8','replace')[:200]}")
        return {"success": False}


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    token, account, project = sys.argv[1], sys.argv[2], sys.argv[3]

    # 1) KV binding for both environments
    body = {"deployment_configs": {
        "production": {"kv_namespaces": {KV_BINDING: {"namespace_id": KV_ID}}},
        "preview":   {"kv_namespaces": {KV_BINDING: {"namespace_id": KV_ID}}},
    }}
    r = api("PATCH", f"/accounts/{account}/pages/projects/{project}", token, body)
    print("  KV binding:", "OK" if r.get("success") else "FAILED")

    # 2) publish secret
    p = api("GET", f"/accounts/{account}/pages/projects/{project}", token)
    cfg = (p.get("result") or {}).get("deployment_configs") or {}
    has_secret = "EDIT_TOKEN" in ((cfg.get("production") or {}).get("env_vars") or {})
    if has_secret:
        print("  publish secret: present")
    else:
        print("  publish secret: MISSING -> re-add it in the admin panel (حسابي) if publishing fails")

    # 3) sanity check the live API
    try:
        req = urllib.request.Request(f"https://{project}.pages.dev/api/data",
                                     headers={"Accept": "application/json",
                                              "User-Agent": "Mozilla/5.0 Chrome/131.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode("utf-8", "replace")
            print("  live API:", r.status, body[:80])
    except Exception as e:
        print("  live API: ERROR", str(e)[:120])


if __name__ == "__main__":
    main()
