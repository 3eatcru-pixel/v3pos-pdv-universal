param(
  [switch]$KeepDesktopShortcut
)

$ErrorActionPreference = 'Stop'
$AppName = 'V3POS PDV Universal'
$StartMenuDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\V3POS'
$StartMenuShortcut = Join-Path $StartMenuDir "$AppName.lnk"

if (Test-Path $StartMenuShortcut) {
  Remove-Item -LiteralPath $StartMenuShortcut -Force
}

if (Test-Path $StartMenuDir -PathType Container) {
  $remaining = Get-ChildItem -LiteralPath $StartMenuDir -Force
  if ($remaining.Count -eq 0) {
    Remove-Item -LiteralPath $StartMenuDir -Force
  }
}

if (-not $KeepDesktopShortcut) {
  $Desktop = [Environment]::GetFolderPath('Desktop')
  $DesktopShortcut = Join-Path $Desktop "$AppName.lnk"
  if (Test-Path $DesktopShortcut) {
    Remove-Item -LiteralPath $DesktopShortcut -Force
  }
}

Write-Host 'Atalhos do V3POS removidos.' -ForegroundColor Green
