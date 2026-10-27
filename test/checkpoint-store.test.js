import test from 'node:test';
import assert from 'node:assert';
import { createTestFixture } from './helpers/fixtures.js';
import { ErrorCode, VectorForceError } from '../src/core/errors.js';
import { generateUuid } from '../src/core/hash.js';

test('T12 Checkpoint: Atomic capture commits checkpoint and receipt', () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Store Task');

    const receipt = fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Initial architecture setup',
      goals: ['Set up schema'],
      constraints: ['Zero npm dependencies'],
      includeGit: false
    });

    assert.strictEqual(receipt.status, 'committed');
    assert.ok(receipt.reference_id);

    const checkpoint = fixture.store.getCheckpoint(receipt.reference_id);
    assert.ok(checkpoint);
    assert.strictEqual(checkpoint.summary, 'Initial architecture setup');
    assert.strictEqual(checkpoint.claims.goals[0], 'Set up schema');
    assert.strictEqual(checkpoint.parent_id, null);
  } finally {
    fixture.cleanup();
  }
});

test('T12 Checkpoint: Idempotent replay returns original receipt without duplicate rows', () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Store Task');

    const params = {
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Step one completed',
      goals: ['Implement store'],
      constraints: ['Immutable history'],
      includeGit: false
    };

    const r1 = fixture.checkpointService.captureCheckpoint(params);
    assert.strictEqual(r1.status, 'committed');

    // Duplicate call with identical parameters
    const r2 = fixture.checkpointService.captureCheckpoint(params);
    assert.strictEqual(r2.status, 'idempotent_replay');
    assert.strictEqual(r2.reference_id, r1.reference_id);
    assert.strictEqual(r2.request_hash, r1.request_hash);

    // Verify only 1 checkpoint exists in store
    const leaves = fixture.store.getLeafCheckpoints(
      fixture.projectService.getProjectForWorkspace(fixture.workspacePath).project_id,
      'task-01'
    );
    assert.strictEqual(leaves.length, 1);
  } finally {
    fixture.cleanup();
  }
});

test('T12 Checkpoint: Parent chain links properly across consecutive steps', () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Store Task');

    const r1 = fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Step 1: Planning',
      goals: ['Plan'],
      constraints: [],
      includeGit: false
    });

    const r2 = fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Step 2: Implementation',
      goals: ['Build'],
      constraints: [],
      includeGit: false
    });

    const c2 = fixture.store.getCheckpoint(r2.reference_id);
    assert.strictEqual(c2.parent_id, r1.reference_id);
  } finally {
    fixture.cleanup();
  }
});

test('T12 Checkpoint: Rejects invalid or cross-task parent checkpoint', () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Task 1');
    fixture.projectService.createTask(fixture.workspacePath, 'task-02', 'Task 2');

    const r1 = fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Task 1 checkpoint',
      goals: [],
      constraints: [],
      includeGit: false
    });

    // Attempt to use task-01 checkpoint as parent for task-02
    assert.throws(() => {
      fixture.checkpointService.captureCheckpoint({
        workspacePath: fixture.workspacePath,
        taskId: 'task-02',
        summary: 'Task 2 trying cross-task parent',
        goals: [],
        constraints: [],
        parentId: r1.reference_id,
        includeGit: false
      });
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.CROSS_TASK_PARENT_FORBIDDEN);
  } finally {
    fixture.cleanup();
  }
});
