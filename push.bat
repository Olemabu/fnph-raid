@echo off
rem Double-click to sync this folder with GitHub (pull, commit everything, push).
rem Optional: put a commit message in .commitmsg first.
cd /d "%~dp0"
git pull --rebase --autostash
git add -A
if exist .commitmsg (
  git commit -F .commitmsg
  del .commitmsg
) else (
  git commit -m "Sync %DATE% %TIME%"
)
git push
git log -1 --oneline > .last-push.txt
git status --short >> .last-push.txt
timeout /t 4 >nul
