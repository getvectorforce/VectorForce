import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SqliteStore,
  ProjectService,
  CheckpointService,
  BriefingService,
  HandoffService,
  ErrorCode,
  VectorForceError
} from '../src/index.js';

function setupWorkspace(name = 'ws-test') {
  const dir = mkdtempSync(join(tmpdir(), `${name}-`));
  const dbPath = join(dir, '.vectorforce', 'vectorforce.db');
  const store = new SqliteStore(dbPath);
  const projectService = new ProjectService(store);
  const checkpointService = new CheckpointService(store, projectService);
  const briefingService = new BriefingService(store, projectService);
  const handoffService = new HandoffService(store, projectService, checkpointService);

  const project = projectService.initProject(dir, name);
  return { dir, store, projectService, checkpointService, briefingService, handoffService, project };
}

test('T20 Handoff: Selective export with preview mode', () => {
  const ws = setupWorkspace('ws-export-preview');

  try {
    const task = ws.projectService.createTask(ws.dir, 'auth-service', 'Implement Auth Service');
    ws.checkpointService.captureCheckpoint({
      workspacePath: ws.dir,
      taskId: 'auth-service',
      summary: 'Auth design completed',
      goals: ['Support JWT', 'Zero external deps'],
      constraints: ['No plain text tokens'],
      decisions: [{ id: 'DEC-1', title: 'Ed25519', rationale: 'High performance' }],
      nextSteps: ['Write crypto benchmarks'],
      includeGit: false
    });

    // Preview export
    const previewResult = ws.handoffService.exportHandoff({
      workspacePath: ws.dir,
      taskId: 'auth-service',
      recipient: 'developer-b@team.internal',
      preview: true
    });

    assert.strictEqual(previewResult.preview, true);
    assert.ok(previewResult.package_id.startsWith('hand-'));
    assert.strictEqual(previewResult.handoff.disclosure.recipient, 'developer-b@team.internal');
    assert.strictEqual(previewResult.handoff.checkpoint.summary, 'Auth design completed');
    assert.strictEqual(previewResult.handoff.checkpoint.claims.goals.length, 2);
    assert.strictEqual(previewResult.handoff.checkpoint.claims.decisions[0].id, 'DEC-1');

    // Boundary Isolation: No parent_id or raw store IDs in export
    assert.strictEqual(previewResult.handoff.checkpoint.parent_id, undefined);
    assert.strictEqual(previewResult.handoff.checkpoint.project_id, undefined);

    // Manifest matches handoff
    assert.strictEqual(previewResult.manifest.files[0].path, 'handoff.json');
    assert.ok(previewResult.manifest.files[0].sha256.length === 64);
  } finally {
    ws.store.close();
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test('T20 Handoff: Requires recipient and enforces safe receipts', () => {
  const ws = setupWorkspace('ws-export-recipient');

  try {
    ws.projectService.createTask(ws.dir, 'auth-service', 'Implement Auth');
    ws.checkpointService.captureCheckpoint({
      workspacePath: ws.dir,
      taskId: 'auth-service',
      summary: 'Initial state',
      goals: ['Initial goal'],
      constraints: ['Initial constraint'],
      decisions: [],
      nextSteps: [],
      includeGit: false
    });

    // Missing recipient throws error
    assert.throws(() => {
      ws.handoffService.exportHandoff({
        workspacePath: ws.dir,
        taskId: 'auth-service',
        recipient: ''
      });
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.HANDOFF_RECIPIENT_REQUIRED);

    // Export to custom path
    const exportFile = join(ws.dir, 'exported-handoff.json');
    const result = ws.handoffService.exportHandoff({
      workspacePath: ws.dir,
      taskId: 'auth-service',
      recipient: 'teammate',
      outPath: exportFile
    });

    assert.ok(result.receipt);
    assert.strictEqual(result.receipt.operation_type, 'export');
    assert.strictEqual(result.receipt.status, 'committed');
    // Safe receipt guarantee: receipt does not embed the full handoff body
    assert.strictEqual(result.receipt.handoff, undefined);
    assert.strictEqual(result.receipt.briefing_path, exportFile);
  } finally {
    ws.store.close();
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test('T21 Handoff: Safe import and context reconciliation in destination workspace', () => {
  const ws1 = setupWorkspace('ws1-origin');
  const ws2 = setupWorkspace('ws2-destination');

  try {
    // 1. Origin: Create task and checkpoint
    ws1.projectService.createTask(ws1.dir, 'data-pipeline', 'ETL Data Pipeline');
    ws1.checkpointService.captureCheckpoint({
      workspacePath: ws1.dir,
      taskId: 'data-pipeline',
      summary: 'Data extraction architecture confirmed',
      goals: ['Process 10k events/sec'],
      constraints: ['Zero external network calls'],
      decisions: [{ id: 'DEC-PIPE-01', title: 'Batching', rationale: 'Micro-batching 100ms' }],
      nextSteps: ['Implement transformation stage'],
      includeGit: false
    });

    // 2. Origin: Export handoff bundle
    const bundleFile = join(tmpdir(), `handoff-test-${Date.now()}.json`);
    ws1.handoffService.exportHandoff({
      workspacePath: ws1.dir,
      taskId: 'data-pipeline',
      recipient: 'worker-node',
      outPath: bundleFile
    });

    // 3. Destination: Import handoff bundle into fresh workspace
    const importResult = ws2.handoffService.importHandoff({
      workspacePath: ws2.dir,
      bundlePath: bundleFile
    });

    assert.strictEqual(importResult.receipt.operation_type, 'import');
    assert.strictEqual(importResult.receipt.status, 'committed');
    assert.ok(importResult.importedCheckpointId);

    // 4. Verify imported briefing in destination
    const briefing = ws2.briefingService.generateBriefing({
      workspacePath: ws2.dir,
      taskId: 'data-pipeline',
      destination: 'command-code'
    });

    assert.ok(briefing.briefingText.includes('Process 10k events/sec'));
    assert.ok(briefing.briefingText.includes('Zero external network calls'));
    assert.ok(briefing.briefingText.includes('DEC-PIPE-01'));
    assert.ok(briefing.briefingText.includes('Imported from ws1-origin'));

    // 5. Context Reconciliation: Destination already has a checkpoint on this task
    ws2.checkpointService.captureCheckpoint({
      workspacePath: ws2.dir,
      taskId: 'data-pipeline',
      summary: 'Local destination development continued',
      goals: ['Local goal'],
      constraints: ['Local constraint'],
      decisions: [{ id: 'DEC-LOCAL-01', title: 'Local SQLite', rationale: 'Faster indexing' }],
      nextSteps: ['Run benchmark'],
      includeGit: false
    });

    // Re-importing creates a reconciled checkpoint linked to current head
    const secondImportResult = ws2.handoffService.importHandoff({
      workspacePath: ws2.dir,
      bundlePath: bundleFile
    });

    const reconciledCheckpoint = ws2.store.getCheckpoint(secondImportResult.importedCheckpointId);
    assert.ok(reconciledCheckpoint.summary.includes('[Reconciled Handoff from ws1-origin]'));
    assert.ok(reconciledCheckpoint.parent_id !== null);

    rmSync(bundleFile, { force: true });
  } finally {
    ws1.store.close();
    ws2.store.close();
    rmSync(ws1.dir, { recursive: true, force: true });
    rmSync(ws2.dir, { recursive: true, force: true });
  }
});
