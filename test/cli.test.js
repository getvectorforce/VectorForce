import test from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('Milestone M1: End-to-end CLI workflow', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'vf-cli-test-'));
  const dbPath = join(tempDir, 'cli.db');
  const vfBin = join(process.cwd(), 'bin', 'vf.js');

  const env = {
    ...process.env,
    VF_DB_PATH: dbPath, VF_WORKSPACE: tempDir
  };

  const runVf = (args) => {
    return execFileSync(process.execPath, [vfBin, ...args], {
      cwd: tempDir,
      env,
      encoding: 'utf8'
    });
  };

  try {
    // 1. vf init
    const initOut = runVf(['init', 'CLI-Integration-Project']);
    assert.ok(initOut.includes('Initialized VectorForce project: CLI-Integration-Project'));

    // 2. vf task
    const taskOut = runVf(['task', 'feat-m1', 'Complete Milestone M1']);
    assert.ok(taskOut.includes('Task registered: Complete Milestone M1 (feat-m1) [active]'));

    // 3. vf tasks
    const tasksOut = runVf(['tasks', 'active']);
    assert.ok(tasksOut.includes('- [active] feat-m1: Complete Milestone M1'));

    // 4. vf policy add
    const docPath = join(tempDir, 'spec.md');
    writeFileSync(docPath, '# Milestone 1 Spec\nTested via CLI.', 'utf8');

    const policyAddOut = runVf(['policy', 'add', 'spec.md']);
    assert.ok(policyAddOut.includes('Updated allowlist: spec.md'));

    const policyListOut = runVf(['policy', 'list']);
    assert.ok(policyListOut.includes('- spec.md'));

    // 5. vf checkpoint
    const checkpointOut = runVf([
      'checkpoint',
      '--task', 'feat-m1',
      '--summary', 'CLI capture test summary',
      '--goal', 'Verify CLI',
      '--constraint', 'Zero dependencies',
      '--decision', 'DEC-CLI:BuiltinChildProcess:Native',
      '--next', 'Resume test',
      '--doc', 'spec.md',
      '--no-git'
    ]);
    assert.ok(checkpointOut.includes('Checkpoint saved:') && checkpointOut.includes('[committed]'));

    // 6. vf resume
    const resumeOut = runVf(['resume', '--task', 'feat-m1', '--dest', 'command-code']);
    assert.ok(resumeOut.includes('# Task Briefing: Complete Milestone M1 (`feat-m1`)'));
    assert.ok(resumeOut.includes('⚠️ Zero dependencies'));
    assert.ok(resumeOut.includes('DEC-CLI: BuiltinChildProcess'));
    assert.ok(resumeOut.includes('Tested via CLI.'));

    // 6b. vf resume with codex destination
    const resumeCodexOut = runVf(['resume', '--task', 'feat-m1', '--dest', 'codex']);
    assert.ok(resumeCodexOut.includes('# Task Briefing: Complete Milestone M1 (`feat-m1`)'));

    // 6c. vf config and config install/uninstall codex
    const configOut = runVf(['config']);
    assert.ok(configOut.includes('OpenAI Codex (codex) Configuration'));
    assert.ok(configOut.includes('.codex/config.toml'));

    const configInstallOut = runVf(['config', 'install', 'codex']);
    assert.ok(configInstallOut.includes('Configured harness integration(s):'));
    assert.ok(configInstallOut.includes('Codex ->'));

    const configUninstallOut = runVf(['config', 'uninstall', 'codex']);
    assert.ok(configUninstallOut.includes('Removed harness integration(s): Codex'));

    // 7. vf drift (no drift)
    const driftOut = runVf(['drift', '--task', 'feat-m1']);
    assert.ok(driftOut.includes('No drift detected'));

    // 8. Modify document and check drift
    writeFileSync(docPath, '# Milestone 1 Spec\nMODIFIED TEXT HERE.', 'utf8');
    const driftModifiedOut = runVf(['drift', '--task', 'feat-m1']);
    assert.ok(driftModifiedOut.includes('DRIFT DETECTED'));
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
});
