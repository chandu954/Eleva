import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const buildDirectory = join(process.cwd(), '.next');
const manifestPath = join(buildDirectory, 'app-build-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// These caps measure compressed first-load JS and CSS from the App Router's
// route manifest. Dynamic chunks are excluded until the feature loads them.
const budgets = [
  { route: '/(dashboard)/resumes/[id]/page', maxBytes: 500 * 1024 },
  { route: '/(dashboard)/home/page', maxBytes: 400 * 1024 },
  { route: '/eleva/resumes/page', maxBytes: 400 * 1024 },
];

let failed = false;
for (const { route, maxBytes } of budgets) {
  const files = manifest.pages[route];
  if (!files) {
    console.error(`Bundle budget could not find route ${route} in ${manifestPath}`);
    failed = true;
    continue;
  }

  const assets = [...new Set(files)].filter((file) => /\.(js|css)$/.test(file));
  const missing = assets.filter((file) => {
    try { statSync(join(buildDirectory, file)); return false; } catch { return true; }
  });
  if (missing.length) {
    console.error(`Bundle budget found missing assets for ${route}:\n${missing.join('\n')}`);
    failed = true;
    continue;
  }

  const bytes = assets.reduce((sum, file) => sum + gzipSync(readFileSync(join(buildDirectory, file))).byteLength, 0);
  const budgetKiB = maxBytes / 1024;
  const actualKiB = bytes / 1024;
  const passed = bytes <= maxBytes;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${route}: ${actualKiB.toFixed(1)} KiB gzip / ${budgetKiB} KiB budget`);
  if (!passed) failed = true;
}

if (failed) process.exitCode = 1;
