import test from 'node:test';
import assert from 'node:assert';
import { symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createTestFixture } from './helpers/fixtures.js';
import { Authorizer, MAX_FILE_BYTES } from '../src/policy/authorizer.js';
import { ErrorCode, VectorForceError } from '../src/core/errors.js';

test('T13 Policy: Rejects path traversal with .. segments', () => {
  const fixture = createTestFixture();
  try {
    assert.throws(() => {
      Authorizer.validateDocumentPath(fixture.workspacePath, '../outside.md');
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.PATH_TRAVERSAL_DETECTED);

    assert.throws(() => {
      Authorizer.validateDocumentPath(fixture.workspacePath, 'docs/../../outside.md');
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.PATH_TRAVERSAL_DETECTED);
  } finally {
    fixture.cleanup();
  }
});

test('T13 Policy: Rejects disallowed file extensions', () => {
  const fixture = createTestFixture();
  try {
    assert.throws(() => {
      Authorizer.validateDocumentPath(fixture.workspacePath, 'secret.env');
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.POLICY_DENIED);

    assert.throws(() => {
      Authorizer.validateDocumentPath(fixture.workspacePath, 'binary.exe');
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.POLICY_DENIED);
  } finally {
    fixture.cleanup();
  }
});

test('T13 Policy: Rejects symbolic links', () => {
  const fixture = createTestFixture();
  try {
    const targetFile = fixture.createFile('real.md', '# Real File');
    const linkPath = join(fixture.workspacePath, 'link.md');
    try {
      symlinkSync(targetFile, linkPath);
    } catch (err) {
      if (err && (err.code === 'EPERM' || err.code === 'ENOSYS')) return;
      throw err;
    }

    assert.throws(() => {
      Authorizer.validateDocumentPath(fixture.workspacePath, 'link.md');
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.POLICY_DENIED);
  } finally {
    fixture.cleanup();
  }
});

test('T13 Policy: Enforces exact allowlist for document capture', () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Test Task');
    fixture.createFile('unapproved.md', 'Secret notes');

    // Attempt to checkpoint unapproved file
    assert.throws(() => {
      fixture.checkpointService.captureCheckpoint({
        workspacePath: fixture.workspacePath,
        taskId: 'task-01',
        summary: 'Capture attempt',
        goals: [],
        constraints: [],
        requestedDocuments: ['unapproved.md'],
        includeGit: false
      });
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.POLICY_DENIED);
  } finally {
    fixture.cleanup();
  }
});

test('T13 Policy: Receipt safety - receipt never contains document content', () => {
  const fixture = createTestFixture();
  try {
    const project = fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Test Task');
    fixture.createFile('approved.md', '# SENSITIVE CONTENT THAT MUST NOT LEAK');
    fixture.store.setDocumentPolicy(project.project_id, ['approved.md']);

    const receipt = fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Safe checkpoint',
      goals: [],
      constraints: [],
      requestedDocuments: ['approved.md'],
      includeGit: false
    });

    const receiptJson = JSON.stringify(receipt);
    assert.ok(!receiptJson.includes('SENSITIVE CONTENT'));
    assert.strictEqual(receipt.status, 'committed');
  } finally {
    fixture.cleanup();
  }
});

test('T13 Policy: Destination harness authorization', () => {
  assert.strictEqual(Authorizer.authorizeDestination('antigravity'), true);
  assert.strictEqual(Authorizer.authorizeDestination('command-code'), true);
  assert.strictEqual(Authorizer.authorizeDestination('muse'), true);
  assert.strictEqual(Authorizer.authorizeDestination('muse-code'), true);
  assert.strictEqual(Authorizer.authorizeDestination('pi'), true);
  assert.strictEqual(Authorizer.authorizeDestination('codex'), true);
  assert.strictEqual(Authorizer.authorizeDestination('cli'), true);

  assert.throws(() => {
    Authorizer.authorizeDestination('untrusted-remote-agent');
  }, (err) => err instanceof VectorForceError && err.code === ErrorCode.UNAUTHORIZED_DESTINATION);
});
