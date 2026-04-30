import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Script de Deploy Automatizado v3POS
 * 1. Limpa resíduos legados
 * 2. Valida tipos (TypeScript)
 * 3. Gera build de produção
 * 4. Envia para Firebase Hosting
 */

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

try {
  console.log('🧹 Passo 1: Removendo arquivos órfãos...');
  run('node scripts/purge-orphans.mjs');

  console.log('🧪 Passo 2: Validando integridade de tipos...');
  run('npx tsc --noEmit');

  console.log('📦 Passo 3: Gerando bundle de produção (Vite)...');
  run('npm run build');

  console.log('🚀 Passo 4: Realizando deploy para Firebase Hosting...');
  run('firebase deploy --only hosting');

  console.log('✨ Deploy concluído com sucesso!');
} catch (error) {
  console.error('❌ Falha no pipeline de deploy:', error.message);
  process.exit(1);
}