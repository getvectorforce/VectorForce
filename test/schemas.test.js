import test from 'node:test';
import assert from 'node:assert';
import {
  validateCheckpoint,
  validateReceipt,
  SCHEMA_VERSION_CHECKPOINT,
  SCHEMA_VERSION_RECEIPT
} from '../src/core/types.js';
import { generateUuid, sha256 } from '../src/core/hash.js';
import { ErrorCode, VectorForceError } from '../src/core/errors.js';

test('Schema Validator: Valid checkpoint passes validation', () => {
  const validCheckpoint = {
    schema_version: SCHEMA_VERSION_CHECKPOINT,
    checkpoint_id: generateUuid(),
    project_id: 'proj-0123456789abcdef',
    task_id: 'task-test-01',
    parent_id: null,
    timestamp: new Date().toISOString(),
    author: { name: 'developer', harness: 'antigravity' },
    summary: 'A valid test checkpoint summary for verification',
    claims: {
      goals: ['Build store'],
      constraints: ['Zero npm runtime dependencies'],
      decisions: [{ id: 'DEC-01', title: 'SQLite', rationale: 'Native in Node 22' }],
      next_steps: ['Write tests'],
      open_questions: []
    },
    evidence: {
      git: {
        commit_hash: '0123456789abcdef0123456789abcdef01234567',
        branch: 'main',
        is_dirty: false,
        collected_at: new Date().toISOString()
      },
      documents: [{
        path: 'docs/test.md',
        sha256: sha256('hello'),
        size_bytes: 5,
        collected_at: new Date().toISOString(),
        untrusted_content: true
      }],
      gaps: []
    },
    metadata: {}
  };

  assert.strictEqual(validateCheckpoint(validCheckpoint), true);
});

test('Schema Validator: Rejects invalid schema_version', () => {
  assert.throws(() => {
    validateCheckpoint({
      schema_version: 'vectorforce/checkpoint/v999',
      checkpoint_id: generateUuid()
    });
  }, (err) => err instanceof VectorForceError && err.code === ErrorCode.SCHEMA_VALIDATION_FAILED);
});

test('Schema Validator: Rejects invalid task_id syntax', () => {
  assert.throws(() => {
    validateCheckpoint({
      schema_version: SCHEMA_VERSION_CHECKPOINT,
      checkpoint_id: generateUuid(),
      project_id: 'proj-0123456789abcdef',
      task_id: 'INVALID/TASK/ID',
      summary: 'Valid summary text'
    });
  }, (err) => err instanceof VectorForceError && err.code === ErrorCode.SCHEMA_VALIDATION_FAILED);
});

test('Schema Validator: Valid receipt passes validation', () => {
  const validReceipt = {
    schema_version: SCHEMA_VERSION_RECEIPT,
    operation_id: generateUuid(),
    operation_type: 'checkpoint',
    status: 'committed',
    reference_id: generateUuid(),
    timestamp: new Date().toISOString(),
    request_hash: sha256('request'),
    warnings: [],
    errors: [],
    briefing_path: null
  };

  assert.strictEqual(validateReceipt(validReceipt), true);
});
