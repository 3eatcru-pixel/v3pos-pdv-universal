param(
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$Url = "http://127.0.0.1:$Port"

Set-Location $ProjectRoot

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'npm.cmd nao foi encontrado. Instale o Node.js LTS antes de iniciar o V3POS.'
}

if (-not (Test-Path (Join-Path $ProjectRoot 'dist\index.html'))) {
  Write-Host 'Build nao encontrado. Gerando dist...' -ForegroundColor Yellow
  npm.cmd run build
}

Write-Host "Iniciando V3POS em $Url" -ForegroundColor Green
$server = Start-Process -FilePath 'npm.cmd' `
  -ArgumentList @('run', 'preview', '--', '--host', '127.0.0.1', '--port', "$Port") `
  -WorkingDirectory $ProjectRoot `
  -PassThru

try {
  $deadline = (Get-Date).AddSeconds(20)
  do {
    Start-Sleep -Milliseconds 500
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { break }
    } catch {
      if ((Get-Date) -gt $deadline) { throw }
    }
  } while ((Get-Date) -le $deadline)

  Start-Process $Url
  Write-Host 'Servidor ativo. Feche esta janela para encerrar o app local.' -ForegroundColor Cyan
  Wait-Process -Id $server.Id
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
