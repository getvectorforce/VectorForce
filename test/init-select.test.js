import test from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VF_BIN = join(process.cwd(), 'bin', 'vf.js');

function runVf(cwd, args, extraEnv = {}) {
  // Pin --workspace so CLI workspace resolution never walks up into a
  // parent directory (e.g. a temp root that itself contains a .git dir).
  return execFileSync(process.execPath, [VF_BIN, ...args, '--workspace', cwd], {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8'
  });
}

function harnessFiles(dir) {
  return [
    join(dir, '.agents', 'mcp_config.json'),
    join(dir, '.mcp.json'),
    join(dir, '.muse', 'mcp_config.json'),
    join(dir, '.codex', 'config.toml'),
    join(dir, '.cursor', 'mcp.json'),
    join(dir, '.windsurf', 'mcp_config.json'),
    join(dir, '.vscode', 'mcp.json'),
    join(dir, '.kiro', 'settings', 'mcp.json')
  ];
}

test('init creates no harness configs when no harness is detected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vf-init-empty-'));
  try {
    const out = runVf(dir, ['init', 'EmptyProj'], { VF_DB_PATH: join(dir, 't.db') });
    assert.ok(out.includes('Initialized VectorForce project: EmptyProj'));
    assert.ok(out.includes('No harness detected'));
    for (const file of harnessFiles(dir)) {
      assert.strictEqual(existsSync(file), false, `should not exist: ${file}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init configures only the detected harness', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vf-init-cursor-'));
  try {
    mkdirSync(join(dir, '.cursor'), { recursive: true });
    const out = runVf(dir, ['init', 'CursorProj'], { VF_DB_PATH: join(dir, 't.db') });
    assert.ok(out.includes('cursor'));
    assert.ok(existsSync(join(dir, '.cursor', 'mcp.json')));
    assert.strictEqual(existsSync(join(dir, '.codex', 'config.toml')), false);
    assert.strictEqual(existsSync(join(dir, '.vscode', 'mcp.json')), false);
    assert.strictEqual(existsSync(join(dir, '.kiro', 'settings', 'mcp.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --harness installs exactly the requested harnesses', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vf-init-flag-'));
  try {
    const env = { VF_DB_PATH: join(dir, 't.db') };
    runVf(dir, ['init', 'FlagProj', '--harness', 'copilot,codex'], env);
    assert.ok(existsSync(join(dir, '.vscode', 'mcp.json')));
    assert.ok(existsSync(join(dir, '.codex', 'config.toml')));
    assert.strictEqual(existsSync(join(dir, '.cursor', 'mcp.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --all restores the previous install-everything behavior', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vf-init-all-'));
  try {
    const env = { VF_DB_PATH: join(dir, 't.db') };
    runVf(dir, ['init', 'AllProj', '--all'], env);
    for (const file of harnessFiles(dir)) {
      assert.strictEqual(existsSync(file), true, `should exist: ${file}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('config list shows supported harnesses with status', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vf-config-list-'));
  try {
    const env = { VF_DB_PATH: join(dir, 't.db') };
    runVf(dir, ['init', 'ListProj'], env);
    const out = runVf(dir, ['config', 'list'], env);
    assert.ok(out.includes('antigravity'));
    assert.ok(out.includes('Google Antigravity'));
    assert.ok(out.includes('copilot'));
    assert.ok(out.includes('GitHub Copilot / VS Code'));
    assert.ok(out.includes('kiro'));
    assert.ok(out.includes('not configured'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('config install rejects unknown harnesses', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vf-config-bad-'));
  try {
    const env = { VF_DB_PATH: join(dir, 't.db') };
    runVf(dir, ['init', 'BadProj'], env);
    assert.throws(() => runVf(dir, ['config', 'install', 'nope'], env));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
