# Script de Limpeza de Arquivos Legados/Órfãos
# Baseado na Auditoria de 23/04/2026

$ErrorActionPreference = 'Continue'
$ProjectRoot = Resolve-Path ".."

# Lista de arquivos identificados como "Dead Ends" (Caminhos sem saída)
$orphans = @(
    "src/App.tsx", # Removido, pois AppShell é o novo entrypoint
    "src/ModularApp.tsx",
    "src/moduleManager.ts",
    "src/core/components/GlobalSettings.tsx",
    "src/core/components/ModeSelector.tsx",
    "src/core/views/ModuleManagement.tsx",
    "src/core/views/PrinterManagement.tsx", # Este foi movido para um arquivo separado, mas a auditoria o marcou como órfão. Reavaliar.
    "src/core/services/RetailSimulationEngine.ts"
)

Write-Host "--- INICIANDO LIMPEZA DE LEGADO ---" -ForegroundColor Cyan

foreach ($file in $orphans) {
    $fullPath = Join-Path $ProjectRoot $file
    if (Test-Path $fullPath) {
        Write-Host "Removendo: $file" -ForegroundColor Yellow
        Remove-Item -Path $fullPath -Force
    }
    else {
        Write-Host "Arquivo já removido ou não encontrado: $file" -ForegroundColor Gray
    }
}

Write-Host "`n--- VALIDAÇÃO PÓS-LIMPEZA ---" -ForegroundColor Cyan
Write-Host "Executando build de teste para garantir integridade..."

Set-Location $ProjectRoot
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCESSO: Arquivos removidos e o sistema continua estável." -ForegroundColor Green
}
else {
    Write-Host "`nALERTA: O build falhou após a remoção. Verifique dependências ocultas." -ForegroundColor Red
}