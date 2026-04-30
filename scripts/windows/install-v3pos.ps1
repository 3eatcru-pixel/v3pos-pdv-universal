param(
  [switch]$NoDesktopShortcut,
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$StartScript = Join-Path $ScriptDir 'start-v3pos.ps1'
$AppName = 'V3POS PDV Universal'

function New-AppShortcut {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$TargetScript
  )

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$TargetScript`" -Port $Port"
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.Description = 'Inicia o V3POS PDV Universal local'
  $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
  $shortcut.Save()
}

Write-Host "Instalando $AppName" -ForegroundColor Green
Write-Host "Projeto: $ProjectRoot"

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw 'node.exe nao foi encontrado. Instale o Node.js LTS e execute o instalador novamente.'
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'npm.cmd nao foi encontrado. Instale o Node.js LTS e execute o instalador novamente.'
}

Set-Location $ProjectRoot

Write-Host 'Instalando dependencias...' -ForegroundColor Cyan
npm.cmd install

Write-Host 'Gerando build de producao...' -ForegroundColor Cyan
npm.cmd run build

$StartMenuDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\V3POS'
New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null
New-AppShortcut -Path (Join-Path $StartMenuDir "$AppName.lnk") -TargetScript $StartScript

if (-not $NoDesktopShortcut) {
  $Desktop = [Environment]::GetFolderPath('Desktop')
  New-AppShortcut -Path (Join-Path $Desktop "$AppName.lnk") -TargetScript $StartScript
}

Write-Host ''
Write-Host 'Instalacao concluida.' -ForegroundColor Green
Write-Host "Atalho criado no Menu Iniciar: $StartMenuDir"
if (-not $NoDesktopShortcut) {
  Write-Host 'Atalho criado na Area de Trabalho.'
}
Write-Host "Porta configurada: $Port"
