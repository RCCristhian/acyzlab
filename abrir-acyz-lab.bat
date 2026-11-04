@echo off
title Acyz Lab (no cierres esta ventana mientras entrenas)
cd /d "%~dp0"
echo Abriendo Acyz Lab en el navegador...
echo Para cerrar la app, cierra esta ventana.
start "" http://localhost:8765
python -m http.server 8765
