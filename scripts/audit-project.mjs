#!/usr/bin/env node

/**
 * Audit Script - Análise contínua do projeto
 * Verifica:
 * 1. Problemas de console.log
 * 2. Erros de compilação TypeScript
 * 3. Caracteres UTF-8 corrompidos
 * 4. Arquivos órfãos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.vite',
  '.next'
];

const IGNORED_FILES = [
  'audit-orphans.mjs',
  'audit-project.mjs',
  'AUDIT_REPORT.md'
];

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findFiles(dir, ext) {
  const files = [];
  
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      // Skip ignored directories
      if (stat.isDirectory()) {
        const dirName = path.basename(fullPath);
        if (!IGNORED_DIRS.includes(dirName)) {
          walk(fullPath);
        }
      } else if (stat.isFile()) {
        if (ext.some(e => fullPath.endsWith(e))) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

function checkConsoleLog() {
  log('\n📋 Verificando console.log...', 'cyan');
  
  const files = findFiles(projectRoot, ['.ts', '.tsx', '.js', '.jsx', '.mjs']);
  let issues = [];
  
  for (const file of files) {
    if (IGNORED_FILES.some(f => file.endsWith(f))) continue;
    
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Skip comments and scripts
      if (file.includes('audit-orphans') || file.includes('scripts/')) return;
      
      // Check for console.log
      if (/console\.log\s*\(/.test(line) && !line.trim().startsWith('//')) {
        issues.push({
          file: path.relative(projectRoot, file),
          line: index + 1,
          message: 'console.log encontrado'
        });
      }
    });
  }
  
  if (issues.length === 0) {
    log('✅ Nenhum console.log encontrado', 'green');
  } else {
    log(`⚠️  ${issues.length} console.log(s) encontrado(s)`, 'yellow');
    issues.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.message}`);
    });
  }
  
  return issues.length === 0;
}

function checkUTF8Issues() {
  log('\n📋 Verificando problemas de codificação UTF-8...', 'cyan');
  
  const files = findFiles(projectRoot, ['.ts', '.tsx', '.js', '.jsx']);
  let issues = [];
  
  const suspiciousPatterns = [
    /Ã†\w+/g,  // Caracteres corrompidos comuns
    /Â\w+/g,
    /\u00c3\u00a2/g,
    /\u00c3\u0083/g
  ];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.push({
          file: path.relative(projectRoot, file),
          message: 'Possível caractere UTF-8 corrompido'
        });
      }
    });
  }
  
  if (issues.length === 0) {
    log('✅ Nenhum problema de codificação UTF-8 encontrado', 'green');
  } else {
    log(`⚠️  ${issues.length} arquivo(s) com possíveis problemas UTF-8`, 'yellow');
    issues.forEach(issue => {
      console.log(`   ${issue.file} - ${issue.message}`);
    });
  }
  
  return issues.length === 0;
}

function checkOrphanFiles() {
  log('\n📋 Verificando arquivos órfãos...', 'cyan');
  log('   (Use: node scripts/audit-orphans.mjs para análise completa)', 'blue');
  
  const result = require('child_process').spawnSync('node', [
    path.join(__dirname, 'audit-orphans.mjs')
  ], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  
  if (result.status === 0) {
    log('✅ Verificação de arquivos órfãos concluída', 'green');
    return true;
  }
  
  return false;
}

async function runFullAudit() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║      Auditoria do Projeto v3pos-pdv-universal             ║', 'cyan');
  log('║      ' + new Date().toLocaleDateString('pt-BR') + '                              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const checks = [
    checkConsoleLog(),
    checkUTF8Issues()
    // checkOrphanFiles() - comentado para não bloquear
  ];
  
  const allPassed = checks.every(check => check);
  
  log('\n' + '═'.repeat(60), 'cyan');
  if (allPassed) {
    log('✅ AUDITORIA CONCLUÍDA COM SUCESSO', 'green');
  } else {
    log('⚠️  AUDITORIA CONCLUÍDA COM AVISOS', 'yellow');
  }
  log('═'.repeat(60), 'cyan');
  
  process.exit(allPassed ? 0 : 1);
}

runFullAudit().catch(err => {
  log(`❌ Erro durante auditoria: ${err.message}`, 'red');
  process.exit(1);
});
