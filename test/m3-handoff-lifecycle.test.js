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
  McpServer
} from '../src/index.js';

test('Milestone M3: Full bidirectional cross-workspace handoff lifecycle', () => {
  // 1. Create two isolated workspaces representing Developer A (Antigravity) and Developer B (Command Code)
  const dirA = mkdtempSync(join(tmpdir(), 'vf-ws-a-antigravity-'));
  const dirB = mkdtempSync(join(tmpdir(), 'vf-ws-b-commandcode-'));

  const storeA = new SqliteStore(join(dirA, '.vectorforce', 'vectorforce.db'));
  const projA = new ProjectService(storeA);
  const ckA = new CheckpointService(storeA, projA);
  const briefA = new BriefingService(storeA, projA);
  const handoffA = new HandoffService(storeA, projA, ckA);
  projA.initProject(dirA, 'PaymentCore-IDE');

  const storeB = new SqliteStore(join(dirB, '.vectorforce', 'vectorforce.db'));
  const projB = new ProjectService(storeB);
  const ckB = new CheckpointService(storeB, projB);
  const briefB = new BriefingService(storeB, projB);
  const handoffB = new HandoffService(storeB, projB, ckB);
  projB.initProject(dirB, 'PaymentCore-Terminal');

  try {
    // Phase 1 (Workspace A / Antigravity):
    // Register task and allowlisted document
    projA.createTask(dirA, 'payment-gateway', 'Stripe & PayPal Integration');
    storeA.setDocumentPolicy('proj-' + projA.getProjectForWorkspace(dirA).project_id.slice(5), ['spec.md']);
    writeFileSync(join(dirA, 'spec.md'), '# Payment Gateway Spec\nStrict idempotency required.', 'utf8');

    // Capture Checkpoint 1
    const receipt1 = ckA.captureCheckpoint({
      workspacePath: dirA,
      taskId: 'payment-gateway',
      summary: 'Architecture specification completed in Antigravity',
      goals: ['Support idempotent charges', 'Zero external SDKs'],
      constraints: ['No plain text API keys in context', 'TLS 1.3 only'],
      decisions: [
        {
          id: 'DEC-PAY-01',
          title: 'Direct HTTP Stdio',
          rationale: 'Avoid bloated vendor libraries'
        }
      ],
      nextSteps: ['Transfer to Command Code for load testing'],
      requestedDocuments: ['spec.md'],
      includeGit: false,
      authorName: 'developer-a',
      authorHarness: 'antigravity'
    });

    assert.strictEqual(receipt1.status, 'committed');

    // Export Handoff from Workspace A
    const transferBundlePath = join(tmpdir(), `m3-transfer-${Date.now()}.json`);
    const exportResult = handoffA.exportHandoff({
      workspacePath: dirA,
      taskId: 'payment-gateway',
      recipient: 'developer-b',
      destinationHarness: 'command-code',
      outPath: transferBundlePath
    });

    assert.strictEqual(exportResult.receipt.status, 'committed');
    assert.strictEqual(exportResult.handoff.disclosure.destination_harness, 'command-code');

    // Phase 2 (Workspace B / Command Code):
    // Import handoff into Workspace B
    const importResult1 = handoffB.importHandoff({
      workspacePath: dirB,
      bundlePath: transferBundlePath
    });

    assert.strictEqual(importResult1.receipt.status, 'committed');
    assert.ok(importResult1.importedCheckpointId);

    // Verify Briefing in Command Code
    const briefingB = briefB.generateBriefing({
      workspacePath: dirB,
      taskId: 'payment-gateway',
      destination: 'command-code'
    });

    // Invariant constraints preserved 100%
    assert.ok(briefingB.briefingText.includes('No plain text API keys in context'));
    assert.ok(briefingB.briefingText.includes('TLS 1.3 only'));
    // Goals preserved 100%
    assert.ok(briefingB.briefingText.includes('Support idempotent charges'));
    // Decision preserved with origin attribution
    assert.ok(briefingB.briefingText.includes('DEC-PAY-01'));
    assert.ok(briefingB.briefingText.includes('Imported from PaymentCore-IDE'));

    // Developer B adds load testing results and captures Checkpoint 2
    const receipt2 = ckB.captureCheckpoint({
      workspacePath: dirB,
      taskId: 'payment-gateway',
      parentCheckpointId: importResult1.importedCheckpointId,
      summary: 'Load testing verified 5,000 req/sec in terminal',
      goals: ['Complete load testing'],
      constraints: ['TLS 1.3 only'],
      decisions: [
        {
          id: 'DEC-PAY-02',
          title: 'Connection Pooling',
          rationale: 'Keepalive pool size set to 64'
        }
      ],
      nextSteps: ['Hand back to Antigravity for UI binding'],
      includeGit: false,
      authorName: 'developer-b',
      authorHarness: 'command-code'
    });

    assert.strictEqual(receipt2.status, 'committed');

    // Export Handoff back to Developer A
    const returnBundlePath = join(tmpdir(), `m3-return-${Date.now()}.json`);
    const returnExport = handoffB.exportHandoff({
      workspacePath: dirB,
      taskId: 'payment-gateway',
      recipient: 'developer-a',
      destinationHarness: 'antigravity',
      outPath: returnBundlePath
    });

    assert.strictEqual(returnExport.receipt.status, 'committed');

    // Phase 3 (Workspace A / Antigravity):
    // Import back into Workspace A
    const returnImport = handoffA.importHandoff({
      workspacePath: dirA,
      bundlePath: returnBundlePath
    });

    assert.strictEqual(returnImport.receipt.status, 'committed');

    // Verify Reconciled Briefing in Antigravity
    const briefingA = briefA.generateBriefing({
      workspacePath: dirA,
      taskId: 'payment-gateway',
      destination: 'antigravity'
    });

    assert.ok(briefingA.briefingText.includes('Connection Pooling'));
    assert.ok(briefingA.briefingText.includes('DEC-PAY-02'));
    assert.ok(briefingA.briefingText.includes('Load testing verified 5,000 req/sec'));

    // Clean up temporary bundle files
    rmSync(transferBundlePath, { force: true });
    rmSync(returnBundlePath, { force: true });
  } finally {
    storeA.close();
    storeB.close();
    rmSync(dirA, { recursive: true, force: true });
    rmSync(dirB, { recursive: true, force: true });
  }
});
