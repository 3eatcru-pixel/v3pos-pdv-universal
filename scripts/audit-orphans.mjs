import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

const toRel = (abs) => path.relative(root, abs).replace(/\\/g, '/');
const sourceFiles = walk(srcRoot);
const fileSet = new Set(sourceFiles.map((file) => toRel(file)));

function resolveImport(fromRel, specifier) {
  if (!specifier.startsWith('.')) return null;
  const fromDir = path.dirname(path.join(root, fromRel));
  const target = path.resolve(fromDir, specifier);
  const candidates = [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    path.join(target, 'index.ts'),
    path.join(target, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    const rel = toRel(candidate);
    if (fileSet.has(rel)) return rel;
  }

  return null;
}

const graph = new Map();
const importRegex = /(?:import|export)\s+(?:[^'"`]*?from\s+)?['"]([^'"]+)['"]/g;

for (const file of fileSet) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const deps = [];
  let match;

  while ((match = importRegex.exec(content))) {
    const resolved = resolveImport(file, match[1]);
    if (resolved) deps.push(resolved);
  }

  graph.set(file, deps);
}

const entry = 'src/main.tsx';
const reachable = new Set();
const queue = [entry];

while (queue.length > 0) {
  const current = queue.shift();
  if (!current || reachable.has(current)) continue;
  reachable.add(current);
  for (const dep of graph.get(current) ?? []) {
    if (!reachable.has(dep)) queue.push(dep);
  }
}

const orphans = [...fileSet].filter((file) => !reachable.has(file)).sort();

console.log(`reachable: ${reachable.size}`);
console.log(`total: ${fileSet.size}`);
console.log(`orphans: ${orphans.length}`);
console.log('');
for (const file of orphans) console.log(file);

