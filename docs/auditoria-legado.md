# Auditoria de Legado - Fase 1

Data: 2026-04-23

## Objetivo
Limpar resíduos da versão antiga sem quebrar o fluxo atual, preparando o código para modularização por motores.

## Limpeza aplicada
- `src/App.tsx`
  - Corrigido import de `CustomizationView` para a fonte real (`GlobalSettingsView`).
  - Extraída lógica de turnos para `ShiftEngine`.
  - Removido estado de modal de impressora que não tinha fluxo ativo.
- `src/core/views/GlobalSettingsView.tsx`
  - Extraída lógica de backup/restauração para `BackupEngine`.
- `src/core/services/ShiftEngine.ts`
  - Novo motor para salvar/remover turnos.
- `src/core/services/BackupEngine.ts`
  - Novo motor para criar e validar backup criptografado.
- `scripts/audit-orphans.mjs`
  - Script para mapear arquivos órfãos por grafo de imports estáticos.

## Validação
- `npm run lint` -> OK
- `npm run build` -> OK

## Resíduos legados identificados
Resultado do script `node scripts/audit-orphans.mjs`:
- 133 arquivos TS/TSX no total
- 74 alcançáveis a partir de `src/main.tsx`
- 59 órfãos (candidatos a remoção ou migração)

Principais candidatos (alto sinal de legado):
- `src/ModularApp.tsx`
- `src/moduleManager.ts`
- `src/core/components/GlobalSettings.tsx`
- `src/core/components/ModeSelector.tsx`
- `src/core/views/ModuleManagement.tsx`
- `src/core/views/PrinterManagement.tsx`

## Próxima fase sugerida
- Rodar remoção em lote dos 59 órfãos em branch dedicada.
- Revalidar com `npm run lint` e `npm run build`.
- Se passar, seguir para fase de “motor por domínio” (pedido, impressora, inventário, permissões).
