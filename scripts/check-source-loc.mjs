import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src');
const limit = 500;
const sourceExtensions = new Set(['.ts', '.tsx']);
const oversized = [];
const oversizedTests = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (!entry.isFile() || !sourceExtensions.has(path.extname(file))) continue;
    if (file.includes(' 2.') || file.endsWith('.d.ts')) continue;
    const lines = (await readFile(file, 'utf8')).split(/\r?\n/).length - 1;
    const relativeFile = path.relative(process.cwd(), file);
    if (/\.(test|spec)\.[^.]+$/.test(file)) {
      if (lines > limit) oversizedTests.push({ file: relativeFile, lines });
      continue;
    }
    if (lines > limit) oversized.push({ file: relativeFile, lines });
  }
}

await walk(root);
if (oversized.length) {
  for (const item of oversized) console.error(`${item.file}: ${item.lines} LOC (limit ${limit})`);
  process.exitCode = 1;
} else {
  console.log(`All production TypeScript files under src are at or below ${limit} LOC.`);
}

for (const item of oversizedTests) {
  const message = `Test file has ${item.lines} LOC (recommended maximum ${limit}); split by behavior when practical.`;
  console.warn(`::warning file=${item.file},line=1::${message}`);
}
if (oversizedTests.length) {
  console.warn(`${oversizedTests.length} test files exceed ${limit} LOC; this is advisory and does not fail the gate.`);
}
