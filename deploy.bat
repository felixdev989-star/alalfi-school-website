@echo off
REM ============================================================
REM  One-command deploy for the AlAlfi school website
REM  Usage:  deploy.bat  [GITHUB_TOKEN] [CLOUDFLARE_TOKEN]
REM ============================================================
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "WRANGLER=%APPDATA%\npm\node_modules\wrangler\bin\wrangler.js"
set "CF_ACCOUNT=78b027e0bbc93bc080113f41d3cd49e8"
set "CF_PROJECT=alalfi-school"

if "%~1"=="" (set "GH_TOKEN=%GITHUB_TOKEN%") else (set "GH_TOKEN=%~1")
if "%~2"=="" (set "CF_TOKEN=%CLOUDFLARE_API_TOKEN%") else (set "CF_TOKEN=%~2")

cd /d "%PROJECT_DIR%"

echo.
echo ==== [1/3] GitHub ====
if "%GH_TOKEN%"=="" (
  echo   skipped - no GitHub token
) else (
  python deploy_github.py "%GH_TOKEN%" alalfi-school-website false
)

echo.
echo ==== [2/3] Cloudflare Pages ====
if "%CF_TOKEN%"=="" (
  echo   skipped - no Cloudflare token
) else (
  set "CLOUDFLARE_API_TOKEN=%CF_TOKEN%"
  node "%WRANGLER%" pages deploy . --project-name %CF_PROJECT% --branch main --commit-dirty=true
)

echo.
echo ==== [3/3] Verify KV binding + publish secret ====
if not "%CF_TOKEN%"=="" (
  python ensure_cloudflare.py "%CF_TOKEN%" %CF_ACCOUNT% %CF_PROJECT%
)

echo.
echo ==== DONE ====
echo   Cloudflare : https://alalfi-school.pages.dev
echo   GitHub     : https://felixdev989-star.github.io/alalfi-school-website/
endlocal
