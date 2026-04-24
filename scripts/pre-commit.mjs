#!/usr/bin/env node

/**
 * Pre-commit Hook - Validação automática antes de commit
 * 
 * Verifica:
 * 1. console.log não autorizado
 * 2. Problemas de codificação UTF-8
 * 3. TypeScript compile errors
 * 4. Arquivos modificados no staging area
 * 
 * Instalação:
 * npm run setup:hooks
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getGitStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(f => f);
  } catch {
    return [];
  }
}

function checkConsoleLog(files) {
  log('\n🔍 Verificando console.log...', 'cyan');
  
  const violations = [];
  const allowedPatterns = [
    /scripts\/audit-.*\.mjs/,
    /\.test\.ts$/,
    /\.spec\.ts$/,
  ];

  for (const file of files) {
    // Skip non-TypeScript/JavaScript files
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;

    // Skip allowed files
    if (allowedPatterns.some(p => p.test(file))) continue;

    const fullPath = path.join(projectRoot, file);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Ignorar comentários
      if (line.trim().startsWith('//')) return;
      
      // Procurar por console.log
      if (/console\.(log|error|warn|debug)\s*\(/.test(line) && !line.includes('// allow-console')) {
        violations.push({
          file,
          line: index + 1,
          message: `console.${line.match(/console\.(log|error|warn|debug)/)?.[1]} encontrado`,
          code: line.trim()
        });
      }
    });
  }

  if (violations.length === 0) {
    log('✅ Nenhum console.log encontrado', 'green');
    return true;
  }

  log(`❌ ${violations.length} violação(ões) encontrada(s):`, 'red');
  violations.forEach(v => {
    console.log(`   ${v.file}:${v.line}`);
    console.log(`   ${v.message}`);
    console.log(`   > ${v.code}`);
  });

  return false;
}

function checkUTF8Issues(files) {
  log('\n🔍 Verificando problemas de UTF-8...', 'cyan');
  
  const violations = [];

  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

    const fullPath = path.join(projectRoot, file);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Procurar por padrões de caracteres corrompidos
    if (/[\u00c3\u00a2][\u00c3\u0083]|Ã†|Â[A-Z]/.test(content)) {
      violations.push({
        file,
        message: 'Possível caractere UTF-8 corrompido detectado'
      });
    }
  }

  if (violations.length === 0) {
    log('✅ Nenhum problema de UTF-8 encontrado', 'green');
    return true;
  }

  log(`⚠️  ${violations.length} arquivo(s) com possíveis problemas UTF-8:`, 'yellow');
  violations.forEach(v => {
    console.log(`   ${v.file} - ${v.message}`);
  });

  return false;
}

function checkTypeScript() {
  log('\n🔍 Verificando TypeScript...', 'cyan');
  
  try {
    execSync('tsc --noEmit', { 
      cwd: projectRoot,
      stdio: 'pipe'
    });
    log('✅ Sem erros TypeScript', 'green');
    return true;
  } catch (error) {
    log('❌ Erros TypeScript encontrados:', 'red');
    const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
    console.log(output);
    return false;
  }
}

async function runPreCommitChecks() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           Pre-commit Hook - Validação Automática           ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const stagedFiles = getGitStagedFiles();

  if (stagedFiles.length === 0) {
    log('\n⚠️  Nenhum arquivo em staging', 'yellow');
    process.exit(0);
  }

  log(`\n📋 ${stagedFiles.length} arquivo(s) em staging:`, 'cyan');
  stagedFiles.forEach(f => console.log(`   - ${f}`));

  const checks = [
    () => checkConsoleLog(stagedFiles),
    () => checkUTF8Issues(stagedFiles),
    () => checkTypeScript()
  ];

  let allPassed = true;
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
  }

  log('\n' + '═'.repeat(60), 'cyan');
  if (allPassed) {
    log('✅ Pré-commit checks APROVADOS', 'green');
    process.exit(0);
  } else {
    log('❌ Pré-commit checks FALHARAM', 'red');
    log('\nFica de pé:');
    log('- Use // allow-console para permitir console.log específico', 'yellow');
    log('- Verifique encoding de caracteres acentuados', 'yellow');
    log('- Corrija erros TypeScript antes de fazer commit', 'yellow');
    process.exit(1);
  }
}

runPreCommitChecks().catch(err => {
  log(`\n❌ Erro durante validação: ${err.message}`, 'red');
  process.exit(1);
});
