// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Environment documentation guard: every process.env.* name referenced from
 * application source must be documented in .env.example (set or commented),
 * so `cp .env.example .env.local` is a complete starting point and new env
 * usage cannot land silently. This is the test counterpart of the promise
 * made in README/CONTRIBUTING.
 *
 * Scope: src/ (production code; test files excluded) and next.config.ts.
 * The health route also enumerates env names inside REQUIRED_ENV_VARS /
 * OPTIONAL_ENV_VARS bracket lookups, but every one of those names is also
 * referenced via process.env.X somewhere in src, so direct-ref scanning
 * covers them transitively.
 *
 * Note: bare `process.env` object access (no explicit key) anywhere in src
 * is un-enumerable and out of scope for this guard.
 */

const REPO_ROOT = join(__dirname, '..', '..');
const DOCS = ['.env.example'];

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx|mjs|js)$/.test(entry)) continue;
    // Test files and vitest config collaborators exercise env variables
    // (e.g. AI_MOCK_PROVIDER toggles) but do not consume them in production.
    if (/\.test\.(ts|tsx)$/.test(entry) || entry.endsWith('.d.ts')) continue;
    if (dir.endsWith('src/test')) continue;
    acc.push(full);
  }
  return acc;
}

function extractEnvNames(content: string): Set<string> {
  const names = new Set<string>();
  for (const match of content.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
    names.add(match[1]!);
  }
  return names;
}

describe('env documentation guard', () => {
  it('documents every process.env.* referenced from application source in .env.example', () => {
    const used = new Map<string, string[]>();
    const sourceRoots = [join(REPO_ROOT, 'src'), join(REPO_ROOT, 'next.config.ts')];
    for (const root of sourceRoots) {
      const stat = statSync(root);
      const files = stat.isDirectory() ? collectSourceFiles(root) : [root];
      for (const file of files) {
        const content = readFileSync(file, 'utf8');
        for (const name of extractEnvNames(content)) {
          used.set(name, [...(used.get(name) ?? []), file.replace(`${REPO_ROOT}/`, '')]);
        }
      }
    }

    const documented = new Set<string>();
    for (const doc of DOCS) {
      const content = readFileSync(join(REPO_ROOT, doc), 'utf8');
      for (const line of content.split('\n')) {
        // A variable is documented when it appears as KEY=... — commented
        // optional keys ("# ENABLED_FEATURE=true") count as documented.
        for (const match of line.matchAll(/^(?:#\s*)?([A-Z][A-Z0-9_]*)=/g)) {
          documented.add(match[1]!);
        }
      }
    }

    const missing = [...used.keys()]
      .filter((name) => !documented.has(name))
      .sort()
      .map((name) => `${name} (used in ${[...new Set(used.get(name) ?? [])].join(', ')})`);

    expect(
      missing,
      `${missing.length} env var(s) used in source are missing from .env.example`,
    ).toEqual([]);
  });

  it('finds at least the well-known integration vars among the documented set', () => {
    const content = readFileSync(join(REPO_ROOT, '.env.example'), 'utf8');
    const documented = new Set(
      [...content.matchAll(/^(?:#\s*)?([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]!),
    );
    for (const name of ['AI_MOCK_PROVIDER', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) {
      expect(documented.has(name), `${name} should be documented`).toBe(true);
    }
  });
});
