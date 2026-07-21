# PowerShell single-launch script (cross-platform friendly)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "=== MergeIT Wazuh Demo — Single Launch ===" -ForegroundColor Green

Write-Host "[1/4] Python deps..." -ForegroundColor Cyan
Push-Location "$root\MergeIT-WazuhConnector"
pip install -r requirements.txt --quiet
Pop-Location

Write-Host "[2/4] Node deps..." -ForegroundColor Cyan
Push-Location "$root\TEST"
if (-not (Test-Path "node_modules")) { npm install }
Pop-Location

Write-Host "[3/4] Starting services..." -ForegroundColor Cyan
Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$root\MergeIT-WazuhConnector`" && python main.py" -PassThru | Out-Null
Start-Sleep -Seconds 3
Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$root\TEST`" && npm run dev" -PassThru | Out-Null

Write-Host "[4/4] Waiting for boot..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "=== Demo ready ===" -ForegroundColor Green
Write-Host "Login:            http://localhost:3000/login"
Write-Host "Admin shortcut:   click 'Admin access' on login page"
Write-Host "Tenant dashboard: http://localhost:3000/tenant"
Write-Host "Connector:        http://localhost:5000/tenants"
Write-Host ""
Write-Host "Press Enter to stop services..." -ForegroundColor Yellow
Read-Host | Out-Null

Get-Process | Where-Object { $_.MainWindowTitle -like "*Connector*" -or $_.MainWindowTitle -like "*Dashboard*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Services stopped."
