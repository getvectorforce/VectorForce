import test from 'node:test';
import assert from 'node:assert';
import { writeFileSync } from 'node:fs';
import { createTestFixture } from './helpers/fixtures.js';
import { ErrorCode, VectorForceError } from '../src/core/errors.js';

test('T15 Briefing: Formats claims and evidence with distinct sections', () => {
  const fixture = createTestFixture();
  try {
    const project = fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Resume Test');
    fixture.createFile('spec.md', '# System Spec\nMust be portable.');
    fixture.store.setDocumentPolicy(project.project_id, ['spec.md']);

    fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Completed Phase 1 Architecture',
      goals: ['Define schemas', 'Pass tests'],
      constraints: ['No external npm packages'],
      decisions: [{ id: 'DEC-01', title: 'SQLite', rationale: 'Native in Node 22' }],
      nextSteps: ['Run test suite'],
      requestedDocuments: ['spec.md'],
      includeGit: false
    });

    const result = fixture.briefingService.generateBriefing({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      destination: 'command-code'
    });

    assert.ok(result.briefingText.includes('# Task Briefing: Resume Test (`task-01`)'));
    assert.ok(result.briefingText.includes('## Invariant Constraints (Non-Negotiable)'));
    assert.ok(result.briefingText.includes('⚠️ No external npm packages'));
    assert.ok(result.briefingText.includes('## Architectural Decisions'));
    assert.ok(result.briefingText.includes('DEC-01: SQLite'));
    assert.ok(result.briefingText.includes('## Allowlisted Documents (Untrusted Reference Data)'));
    assert.ok(result.briefingText.includes('Must be portable.'));
    assert.strictEqual(result.driftDetected, false);
  } finally {
    fixture.cleanup();
  }
});

test('T15 Briefing: Detects document drift when file content is modified', () => {
  const fixture = createTestFixture();
  try {
    const project = fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Drift Test');
    const docPath = fixture.createFile('notes.md', 'Version 1 content');
    fixture.store.setDocumentPolicy(project.project_id, ['notes.md']);

    fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Initial state before drift',
      goals: [],
      constraints: [],
      requestedDocuments: ['notes.md'],
      includeGit: false
    });

    // Modify the document
    writeFileSync(docPath, 'Version 2 MODIFIED content', 'utf8');

    const result = fixture.briefingService.generateBriefing({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      destination: 'antigravity'
    });

    assert.strictEqual(result.driftDetected, true);
    assert.ok(result.warnings.some(w => w.includes('content has changed since checkpoint')));
  } finally {
    fixture.cleanup();
  }
});

test('T15 Briefing: Divergent heads error requires explicit checkpoint ID', () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'task-01', 'Branching Task');

    const root = fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      summary: 'Root checkpoint',
      goals: [],
      constraints: [],
      includeGit: false
    });

    // Fork: two children from root
    fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      parentId: root.reference_id,
      summary: 'Branch A',
      goals: [],
      constraints: [],
      includeGit: false
    });

    fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'task-01',
      parentId: root.reference_id,
      summary: 'Branch B',
      goals: [],
      constraints: [],
      includeGit: false
    });

    // Resume without checkpointId should throw DIVERGENT_HEADS
    assert.throws(() => {
      fixture.briefingService.generateBriefing({
        workspacePath: fixture.workspacePath,
        taskId: 'task-01',
        destination: 'cli'
      });
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.DIVERGENT_HEADS);
  } finally {
    fixture.cleanup();
  }
});
