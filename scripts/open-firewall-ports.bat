@echo off
:: Run this file as Administrator (right-click → Run as administrator)
:: Adds Windows Firewall inbound rules so iPad/phone can reach Chakravyuh on the LAN

echo Opening Chakravyuh ports in Windows Firewall...

netsh advfirewall firewall delete rule name="Chakravyuh Web (3000)" >nul 2>&1
netsh advfirewall firewall delete rule name="Chakravyuh API (8000)" >nul 2>&1

netsh advfirewall firewall add rule name="Chakravyuh Web (3000)" protocol=TCP dir=in localport=3000 action=allow
netsh advfirewall firewall add rule name="Chakravyuh API (8000)" protocol=TCP dir=in localport=8000 action=allow

echo.
echo Done! Firewall rules added.
echo.
echo Access Chakravyuh from any device on the same WiFi:
echo   http://192.168.1.93:3000
echo.
pause
