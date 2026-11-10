@echo off
REM ============================================================
REM  One-command deploy for the AlAlfi school website
REM  Usage:  deploy.bat  [GITHUB_TOKEN] [CLOUDFLARE_TOKEN]
REM  (tokens can also be set as env vars, or left empty to
REM   skip that platform)
REM ============================================================
setlocal

set "PROJECT_DIR=%~dp0"
set "WRANGLER=%APPDATA%\npm\node_modules\wrangler\bin\wrangler.js"

if "%~1"=="" set "GH_TOKEN=%GITHUB_TOKEN%" else set "GH_TOKEN=%~1"
if "%~2"=="" set "CF_TOKEN=%CLOUDFLARE_API_TOKEN%" else set "CF_TOKEN=%~2"

cd /d "%PROJECT_DIR%"

echo.
echo ==== [1/2] GitHub ====
if "%GH_TOKEN%"=="" (
  echo   skipped - no GitHub token
) else (
  python deploy_github.py "%GH_TOKEN%" alalfi-school-website false
)

echo.
echo ==== [2/2] Cloudflare Pages ====
if "%CF_TOKEN%"=="" (
  echo   skipped - no Cloudflare token
) else (
  set "CLOUDFLARE_API_TOKEN=%CF_TOKEN%"
  node "%WRANGLER%" pages deploy . --project-name alalfi-school --branch main --commit-dirty=true
)

echo.
echo ==== DONE ====
echo   Cloudflare : https://alalfi-school.pages.dev
echo   GitHub     : https://felixdev989-star.github.io/alalfi-school-website/
endlocal
