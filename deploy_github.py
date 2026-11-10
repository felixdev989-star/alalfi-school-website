"""
Create a GitHub repository and push the project to it.

Usage:
  python deploy_github.py <TOKEN> [REPO_NAME] [PRIVATE=true|false]

Create the token at:
  https://github.com/settings/tokens -> Generate new token (classic)
  Scopes: repo  (public_repo is enough for a public repo)
"""
import os, sys, json, subprocess, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.abspath(__file__))
API = "https://api.github.com"


def gh(method, path, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "alalfi-deploy",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} {method} {path}\n{e.read().decode('utf-8','replace')[:600]}")
        return None


def run(cmd, cwd=ROOT, creds=None):
    env = dict(os.environ)
    if creds:
        env["GIT_ASKPASS"] = creds
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=True, env=env)
    return p.returncode, p.stdout, p.stderr


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    token = sys.argv[1]
    repo = sys.argv[2] if len(sys.argv) > 2 else "alalfi-school-website"
    private = (sys.argv[3].lower() == "true") if len(sys.argv) > 3 else False

    print("==> checking token / user")
    user = gh("GET", "/user", token)
    if not user:
        print("Invalid token.")
        sys.exit(1)
    login = user["login"]
    print(f"    authenticated as {login}")

    print(f"==> creating repo '{repo}'")
    r = gh("POST", "/user/repos", token, {
        "name": repo,
        "description": "مدرسة الالفي الثانوية المشتركة — إدارة منيا القمح التعليمية",
        "private": private,
        "auto_init": False,
        "has_issues": True,
        "has_pages": True,
    })
    if r and r.get("html_url"):
        print("    created:", r["html_url"])
    elif r and r.get("message"):
        print("    note:", r["message"], "(repo may already exist)")
    else:
        print("    could not create repo")
        sys.exit(1)

    url = f"https://github.com/{login}/{repo}.git"
    print(f"==> setting remote -> {url}")
    run('git remote remove origin')
    run(f'git remote add origin "{url}"')

    # push with token embedded temporarily (most reliable, non-interactive)
    print("==> pushing main branch")
    auth_url = f"https://{token}@github.com/{login}/{repo}.git"
    rc, out, err = run(f'git push -u "{auth_url}" main:main')
    print(out[-900:] if out else "")
    if err.strip():
        print(err[-900:])
    if rc != 0:
        print("\nPush failed. Run manually in the project folder:")
        print('  git remote set-url origin https://<TOKEN>@github.com/%s/%s.git' % (login, repo))
        print('  git push -u origin main')
        print("  then: git remote set-url origin " + url)
        sys.exit(1)

    # restore clean remote (no token stored in .git/config)
    run(f'git remote set-url origin "{url}"')
    print("    remote restored without token")

    print("\n=== DONE ===")
    print("Repo:", f"https://github.com/{login}/{repo}")

    # enable Pages
    print("==> enabling GitHub Pages")
    p = gh("POST", f"/repos/{login}/{repo}/pages", token, {"source": {"branch": "main", "path": "/"}})
    if p:
        print("   ", p.get("html_url") or p.get("message"))


if __name__ == "__main__":
    main()
