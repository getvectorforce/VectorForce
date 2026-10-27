import test from 'node:test';
import assert from 'node:assert';
import { createTestFixture } from './helpers/fixtures.js';
import { ErrorCode, VectorForceError } from '../src/core/errors.js';

test('T11 Project: Idempotent initialization returns existing identity', () => {
  const fixture = createTestFixture();
  try {
    const p1 = fixture.projectService.initProject(fixture.workspacePath, 'my-test-proj');
    const p2 = fixture.projectService.initProject(fixture.workspacePath, 'my-test-proj');

    assert.strictEqual(p1.project_id, p2.project_id);
    assert.strictEqual(p1.canonical_path, p2.canonical_path);
    assert.strictEqual(p1.name, 'my-test-proj');
  } finally {
    fixture.cleanup();
  }
});

test('T11 Task: Task creation and listing', () => {
  const fixture = createTestFixture();
  try {
    const project = fixture.projectService.initProject(fixture.workspacePath);
    const task1 = fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'First Task');
    const task2 = fixture.projectService.createTask(fixture.workspacePath, 'task-02', 'Second Task');

    assert.strictEqual(task1.task_id, 'task-01');
    assert.strictEqual(task1.status, 'active');

    const tasks = fixture.store.listTasks(project.project_id);
    assert.strictEqual(tasks.length, 2);
  } finally {
    fixture.cleanup();
  }
});

test('T11 Task: Ambiguous task resolution refuses to guess without explicit task ID', () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'First Task');
    fixture.projectService.createTask(fixture.workspacePath, 'task-02', 'Second Task');

    // Attempt to resolve without specifying task ID
    assert.throws(() => {
      fixture.projectService.resolveTask(fixture.workspacePath, null);
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.AMBIGUOUS_TASK_SELECTION);

    // Resolving with explicit task ID succeeds
    const resolved = fixture.projectService.resolveTask(fixture.workspacePath, 'task-01');
    assert.strictEqual(resolved.task.task_id, 'task-01');
  } finally {
    fixture.cleanup();
  }
});
