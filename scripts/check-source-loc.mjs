import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src');
const limit = 500;
const sourceExtensions = new Set(['.ts', '.tsx']);
const oversized = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (!entry.isFile() || !sourceExtensions.has(path.extname(file))) continue;
    if (/\.test\.[^.]+$/.test(file) || /\.spec\.[^.]+$/.test(file) || file.endsWith('.d.ts')) continue;
    const lines = (await readFile(file, 'utf8')).split(/\r?\n/).length - 1;
    if (lines > limit) oversized.push({ file: path.relative(process.cwd(), file), lines });
  }
}

await walk(root);
if (oversized.length) {
  for (const item of oversized) console.error(`${item.file}: ${item.lines} LOC (limit ${limit})`);
  process.exitCode = 1;
} else {
  console.log(`All production TypeScript files under src are at or below ${limit} LOC.`);
}
