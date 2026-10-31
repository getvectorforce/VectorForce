#!/usr/bin/env node
/**
 * Sample 01: Cross-Harness Context Continuity & Signed Handoff
 *
 * Demonstrates the programmatic VectorForce SDK across:
 * 1. Google Antigravity (captures initial architectural checkpoint)
 * 2. Meta Muse (`muse-code`) (resumes context + inspects workspace drift)
 * 3. Cryptographic HMAC-SHA256 Handoff Export -> Teammate Workspace Import (Command Code)
 *
 * Run: node samples/01-cross-harness-handoff.js
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  SqliteStore,
  ProjectService,
  CheckpointService,
  BriefingService,
  HandoffService
} from '../src/index.js';

function initGitWorkspace(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  execSync('git init && git config user.email "dev@vectorforce.dev" && git config user.name "VectorForce Sample"', {
    cwd: dir,
    stdio: 'ignore'
  });
  writeFileSync(join(dir, 'AGENTS.md'), '# Sample Workspace Protocol\nAll constraints are enforced.\n');
  writeFileSync(join(dir, 'auth.js'), 'export function verifyToken(token) { return Boolean(token); }\n');
  execSync('git add . && git commit -m "feat: initial auth module"', { cwd: dir, stdio: 'ignore' });
  return dir;
}

const wsA = initGitWorkspace('vf-sample-devA-');
const wsB = initGitWorkspace('vf-sample-devB-');

try {
  console.log('=== VectorForce Sample 01: Cross-Harness Continuity & Signed Handoff ===\n');

  // 1. Initialize Workspace A (Google Antigravity)
  const storeA = new SqliteStore(join(wsA, '.vectorforce', 'vectorforce.db'));
  const projectsA = new ProjectService(storeA);
  const checkpointsA = new CheckpointService(storeA, projectsA);
  const briefingsA = new BriefingService(storeA, projectsA);
  const handoffsA = new HandoffService(storeA, projectsA, checkpointsA);

  const projMetaA = projectsA.initProject(wsA, 'Sample Production Service');
  storeA.setDocumentPolicy(projMetaA.project_id, ['AGENTS.md']);
  projectsA.createTask(wsA, 'payment-gateway', 'Implement Idempotent Payment Gateway');

  // 2. Capture Checkpoint from Antigravity
  const receipt1 = checkpointsA.captureCheckpoint({
    workspacePath: wsA,
    taskId: 'payment-gateway',
    authorName: 'developer-a',
    authorHarness: 'antigravity',
    summary: 'Implemented token verification and idempotency key schema',
    goals: ['Guarantee zero duplicate charges on retry'],
    constraints: ['Never log raw payment tokens', 'Zero external runtime dependencies'],
    decisions: [
      { id: 'DEC-PAY-01', title: 'SHA-256 Idempotency Keys', rationale: 'Deterministic request deduplication' }
    ],
    nextSteps: ['Add webhook signature verification in Meta Muse'],
    requestedDocuments: ['AGENTS.md']
  });
  console.log(`[1] Checkpoint committed in Antigravity: ${receipt1.reference_id} (${receipt1.status})`);

  // 3. Resume in Meta Muse (`muse-code`)
  const briefing = briefingsA.generateBriefing({
    workspacePath: wsA,
    taskId: 'payment-gateway',
    destination: 'muse-code'
  });
  console.log(`[2] Briefing generated for Meta Muse (${briefing.briefingText.split('\n').length} lines, driftDetected: ${briefing.driftDetected})`);

  // 4. Export Signed Handoff Package & Import into Teammate Workspace B (Command Code)
  const handoffPath = join(wsA, 'payment-gateway.vfhandoff.json');
  const exported = handoffsA.exportHandoff({
    workspacePath: wsA,
    taskId: 'payment-gateway',
    recipient: 'developer-b',
    destinationHarness: 'command-code',
    outPath: handoffPath
  });
  console.log(`[3] Exported HMAC-SHA256 signed handoff package: ${exported.receipt.reference_id}`);

  const storeB = new SqliteStore(join(wsB, '.vectorforce', 'vectorforce.db'));
  const projectsB = new ProjectService(storeB);
  const checkpointsB = new CheckpointService(storeB, projectsB);
  const handoffsB = new HandoffService(storeB, projectsB, checkpointsB);
  projectsB.initProject(wsB, 'Sample Production Service (Teammate)');

  const imported = handoffsB.importHandoff({
    workspacePath: wsB,
    bundlePath: handoffPath
  });
  console.log(`[4] Teammate imported handoff verified: status=${imported.receipt.status}, checkpoint=${imported.importedCheckpointId}`);
  console.log('\n✅ Sample 01 completed successfully.');

  storeA.close();
  storeB.close();
} finally {
  rmSync(wsA, { recursive: true, force: true });
  rmSync(wsB, { recursive: true, force: true });
}
