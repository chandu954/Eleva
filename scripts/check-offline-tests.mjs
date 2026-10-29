#!/usr/bin/env node

/**
 * Offline test guarantee — CI counterpart of CONTRIBUTING.md →
 * "Offline test guarantee".
 *
 * The unit suite must never reach the network. Two layers already exist:
 *
 *   1. Runtime — src/test/setup.ts replaces global fetch with a rejecting
 *      stub, asserted by src/test/network-guard.test.ts.
 *   2. Static — eslint.config.mjs bans direct fetch()/WebSocket/... calls
 *      inside *.test.{ts,tsx} (except the stub helpers under src/test/).
 *
 * Neither layer is a process-wide socket firewall, so this script adds a
 * third: it re-runs the suite with OS-level network access removed and fails
 * if anything tries to open a connection. Where the sandbox mechanism is
 * unavailable on the host (non-Linux, restricted container), it degrades to a
 * loud warning rather than a false failure — the two enforced layers above
 * still gate the build.
 *
 * Usage: node scripts/check-offline-tests.mjs [-- <extra vitest args>]
 */
import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';

const passthroughIdx = process.argv.indexOf('--');
const extraArgs = passthroughIdx === -1 ? [] : process.argv.slice(passthroughIdx + 1);

/**
 * Returns the command prefix of a *working* network sandbox, or null when the
 * host cannot provide one.
 *
 * Linux: an unshare'd network namespace leaves the child loopback only.
 * macOS: sandbox-exec denies the network* subsystem.
 * Each mechanism is probed before use, so an unavailable one (for example a
 * container without CAP_SYS_ADMIN) surfaces as a warning, never as a fake
 * test failure.
 */
function detectSandbox() {
  if (platform() === 'linux') {
    const probe = spawnSync('unshare', ['-rn', 'true'], { stdio: 'ignore' });
    if (probe.status === 0) return { prefix: ['unshare', '-rn'], label: 'unshare -rn (isolated netns)' };
  }
  if (platform() === 'darwin') {
    const profile = '(version 1)(allow default)(deny network*)';
    const probe = spawnSync('sandbox-exec', ['-p', profile, 'true'], { stdio: 'ignore' });
    if (probe.status === 0) return { prefix: ['sandbox-exec', '-p', profile], label: 'sandbox-exec (deny network*)' };
  }
  return null;
}

const sandbox = detectSandbox();

if (!sandbox) {
  console.warn(
    '::warning::No OS network sandbox available on this host. Skipping the ' +
      'isolated unit-test run; the in-process fetch guard (src/test/setup.ts) ' +
      'and the ESLint no-restricted-syntax rule still enforce offline tests.',
  );
  process.exit(0);
}

const vitestArgs = ['vitest', 'run', '--reporter=dot', ...extraArgs];

console.log(`Running the unit suite with network access disabled (${sandbox.label}).`);

// CI=true makes Vitest bail on any unhandled rejection from the fetch guard.
const [cmd, ...sandboxArgs] = sandbox.prefix;
const result = spawnSync(cmd, [...sandboxArgs, 'pnpm', ...vitestArgs], {
  stdio: 'inherit',
  env: { ...process.env, CI: 'true' },
});

if (result.error) {
  console.error(`::error::Failed to launch the sandboxed test run: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    `::error::The unit suite failed under network isolation (${sandbox.label}). ` +
      'A test is reaching a live host — add a stub under src/test/ instead.',
  );
  process.exit(result.status ?? 1);
}

console.log('✓ Unit suite passes with OS-level network access disabled.');
