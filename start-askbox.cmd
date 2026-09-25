@echo off
rem Build the client and start AskBox as a single server. Logs go to askbox.log.
rem Then open http://localhost:3001 in the browser.
cd /d "%~dp0"
npm start > askbox.log 2>&1
