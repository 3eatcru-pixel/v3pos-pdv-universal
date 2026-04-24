#!/usr/bin/env node

/**
 * Setup Git Hooks
 * 
 * Configura git hooks automaticamente:
 * - pre-commit: Validação antes de commit
 * - prepare-commit-msg: (Opcional) Formatar mensagem de commit
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const hooksDir = path.join(projectRoot, '.git', 'hooks');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ensureHooksDir() {
  if (!fs.existsSync(hooksDir)) {
    log(`❌ Diretório .git/hooks não encontrado. Repository git não inicializado?`, 'red');
    process.exit(1);
  }
}

function createPreCommitHook() {
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const hookContent = `#!/bin/bash
node ${path.join(__dirname, 'pre-commit.mjs')}
exit $?
`;

  // Remover hook anterior se existir
  if (fs.existsSync(preCommitPath)) {
    fs.unlinkSync(preCommitPath);
  }

  // Criar novo hook
  fs.writeFileSync(preCommitPath, hookContent, { mode: 0o755 });
  log('✅ Pre-commit hook criado', 'green');
}

function verifySetup() {
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  
  if (!fs.existsSync(preCommitPath)) {
    log('❌ Falha ao criar pre-commit hook', 'red');
    return false;
  }

  const content = fs.readFileSync(preCommitPath, 'utf8');
  if (!content.includes('pre-commit.mjs')) {
    log('❌ Pre-commit hook inválido', 'red');
    return false;
  }

  log('✅ Pre-commit hook verificado com sucesso', 'green');
  return true;
}

function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║          Setup de Git Hooks - Validação Automática         ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');

  ensureHooksDir();

  log('\n📝 Configurando pre-commit hook...', 'blue');
  createPreCommitHook();

  if (!verifySetup()) {
    process.exit(1);
  }

  log('\n' + '═'.repeat(60), 'blue');
  log('✅ Git hooks configurados com sucesso!', 'green');
  log('\n📋 Hooks instalados:', 'blue');
  log('   - pre-commit: Valida console.log, UTF-8 e TypeScript', 'yellow');

  log('\n💡 Dicas:', 'blue');
  log('   - Os hooks serão executados automaticamente antes de cada commit', 'yellow');
  log('   - Use "git commit --no-verify" para pular os hooks (não recomendado)', 'yellow');
  log('   - Use // allow-console para permitir console.log específico', 'yellow');

  log('\n🚀 Pronto para usar!', 'green');
}

main();
