import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Script para remover arquivos órfãos identificados na auditoria.
 * ATENÇÃO: Execute apenas após garantir que não há dependências dinâmicas.
 */
const ORPHAN_FILES = [
  'src/ModularApp.tsx',
  'src/moduleManager.ts',
  'src/core/components/GlobalSettings.tsx',
  'src/core/components/ModeSelector.tsx',
  'src/core/views/ModuleManagement.tsx',
  'useScheduling.ts', // Auditoria: Duplicata na raiz, deve ser removido.
  'useCommissionReport.ts' // Auditoria: Duplicata na raiz, deve ser removido.
];

console.log('🚀 Iniciando purga de arquivos legados...');
ORPHAN_FILES.forEach(file => {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`✅ Removido: ${file}`);
  }
});
console.log('✨ Limpeza concluída. Execute "npm run build" para validar.');