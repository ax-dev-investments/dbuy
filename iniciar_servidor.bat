@echo off
title Servidor dBuy - Puerto 3099
echo ========================================================
echo             INICIANDO SERVIDOR LOCAL DBUY
echo ========================================================
echo.
echo Cambiando al directorio del proyecto...
cd /d "%~dp0"
echo.
echo Abriendo la aplicacion en tu navegador...
start http://localhost:3099
echo.
echo Servidor activo en http://localhost:3099
echo (Para apagar el servidor, cierra esta ventana de consola)
echo.
python -m http.server 3099
pause
