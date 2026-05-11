@echo off
cd /d "%~dp0logofood-app"
if not exist node_modules (
    echo Installing dependencies for logofood-app...
    npm install
)
echo Starting LogoFood SSR server (Express + Handlebars)...
npm start