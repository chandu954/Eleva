import { readFileSync, statSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DOCS = [join(ROOT, '.env.example')];
const SOURCE_ROOTS = [join(ROOT, 'src'), join(ROOT, 'scripts'), join(ROOT, 'next.config.ts')];

const ENV_REF = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
const ENV_BRACKET = /process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g;
const DOC_KEY = /^(?:#\s*)?([A-Za-z_][A-Za-z0-9_]*)=/;

function collectSourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx|mjs|js)$/.test(entry.name)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
    acc.push(full);
  }
  return acc;
}

function referencedEnvVars() {
  const used = new Map();
  for (const root of SOURCE_ROOTS) {
    const stat = statSync(root);
    const files = stat.isDirectory() ? collectSourceFiles(root) : [root];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const m of content.matchAll(ENV_REF)) {
        (used.get(m[1]) ?? []).push(file);
        used.set(m[1], [...(used.get(m[1]) ?? [])]);
      }
      for (const m of content.matchAll(ENV_BRACKET)) {
        (used.get(m[1]) ?? []).push(file);
        used.set(m[1], [...(used.get(m[1]) ?? [])]);
      }
    }
  }
  return used;
}

function documentedEnvVars() {
  const documented = new Set();
  for (const doc of DOCS) {
    for (const line of readFileSync(doc, 'utf8').split('\n')) {
      const m = line.match(DOC_KEY);
      if (m) documented.add(m[1]);
    }
  }
  return documented;
}

const used = referencedEnvVars();
const documented = documentedEnvVars();
const missing = [...used.keys()].filter((name) => !documented.has(name)).sort();

if (missing.length) {
  console.error('.env.example is missing environment variables referenced in source:');
  for (const name of missing) {
    console.error(`  - ${name} (used in ${[...new Set(used.get(name))].join(', ')})`);
  }
  console.error(`Add them to .env.example (commented optional keys count as documented).`);
  process.exit(1);
}

console.log(
  `env example parity OK: ${used.size} env vars referenced in source, all documented in .env.example`
);
process.exit(0);
