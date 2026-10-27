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

function setupWorkspace(name = 'ws-sec-test') {
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

test('T22 Security: Rejects path traversal in export outPath', () => {
  const ws = setupWorkspace('ws-sec-export-path');

  try {
    ws.projectService.createTask(ws.dir, 'sec-task', 'Security Task');
    ws.checkpointService.captureCheckpoint({
      workspacePath: ws.dir,
      taskId: 'sec-task',
      summary: 'Task summary',
      goals: ['Goal'],
      constraints: ['Constraint'],
      decisions: [],
      nextSteps: [],
      includeGit: false
    });

    assert.throws(() => {
      ws.handoffService.exportHandoff({
        workspacePath: ws.dir,
        taskId: 'sec-task',
        recipient: 'attacker',
        outPath: '../../etc/passwd.json'
      });
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.PATH_TRAVERSAL_DETECTED);
  } finally {
    ws.store.close();
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test('T22 Security: Rejects corrupted manifest hash mismatch on import', () => {
  const ws = setupWorkspace('ws-sec-hash-mismatch');

  try {
    const corruptedBundlePath = join(ws.dir, 'corrupted-handoff.json');
    const fakeBundle = {
      schema_version: 'vectorforce/handoff-bundle/v1',
      package_id: 'hand-corrupt-001',
      created_at: new Date().toISOString(),
      manifest: {
        schema_version: 'vectorforce/manifest/v1',
        package_id: 'hand-corrupt-001',
        created_at: new Date().toISOString(),
        files: [
          {
            path: 'handoff.json',
            sha256: '0000000000000000000000000000000000000000000000000000000000000000', // incorrect hash
            size_bytes: 123
          }
        ]
      },
      handoff: {
        schema_version: 'vectorforce/handoff/v1',
        package_id: 'hand-corrupt-001',
        created_at: new Date().toISOString(),
        origin: {
          project_name: 'test-project',
          task_id: 'tampered-task'
        },
        disclosure: {
          recipient: 'victim',
          destination_harness: 'any'
        },
        checkpoint: {
          summary: 'Tampered summary',
          claims: {
            goals: ['Goal'],
            constraints: ['Constraint'],
            decisions: [],
            next_steps: []
          },
          evidence: {
            git: null,
            documents: [],
            gaps: []
          }
        }
      }
    };

    writeFileSync(corruptedBundlePath, JSON.stringify(fakeBundle, null, 2), 'utf8');

    assert.throws(() => {
      ws.handoffService.importHandoff({
        workspacePath: ws.dir,
        bundlePath: corruptedBundlePath
      });
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.HANDOFF_INTEGRITY_FAILED);
  } finally {
    ws.store.close();
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test('T22 Security: Rejects non-existent or malformed bundle files', () => {
  const ws = setupWorkspace('ws-sec-malformed');

  try {
    // 1. Missing file
    assert.throws(() => {
      ws.handoffService.importHandoff({
        workspacePath: ws.dir,
        bundlePath: join(ws.dir, 'does-not-exist.json')
      });
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.HANDOFF_VALIDATION_FAILED);

    // 2. Malformed JSON
    const malformedPath = join(ws.dir, 'malformed.json');
    writeFileSync(malformedPath, '{ "schema_version": broken JSON', 'utf8');

    assert.throws(() => {
      ws.handoffService.importHandoff({
        workspacePath: ws.dir,
        bundlePath: malformedPath
      });
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.HANDOFF_VALIDATION_FAILED);
  } finally {
    ws.store.close();
    rmSync(ws.dir, { recursive: true, force: true });
  }
});
