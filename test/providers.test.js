import test from 'node:test';
import assert from 'node:assert';
import { writeFileSync } from 'node:fs';
import { createTestFixture } from './helpers/fixtures.js';
import { DocumentProvider } from '../src/providers/document-provider.js';
import { GitProvider } from '../src/providers/git-provider.js';
import { ErrorCode, VectorForceError } from '../src/core/errors.js';
import { sha256 } from '../src/core/hash.js';

test('T14 Provider: DocumentProvider successfully collects valid document', () => {
  const fixture = createTestFixture();
  try {
    const content = '# Architectural Guidelines\n- Clean code\n';
    fixture.createFile('guidelines.md', content);

    const result = DocumentProvider.collect(
      fixture.workspacePath,
      ['guidelines.md'],
      ['guidelines.md']
    );

    assert.strictEqual(result.documents.length, 1);
    assert.strictEqual(result.documents[0].path, 'guidelines.md');
    assert.strictEqual(result.documents[0].sha256, sha256(content));
    assert.strictEqual(result.documents[0].untrusted_content, true);
    assert.strictEqual(result.gaps.length, 0);
  } finally {
    fixture.cleanup();
  }
});

test('T14 Provider: DocumentProvider records explicit gap when allowlisted file is missing', () => {
  const fixture = createTestFixture();
  try {
    const result = DocumentProvider.collect(
      fixture.workspacePath,
      ['missing.md'],
      ['missing.md']
    );

    assert.strictEqual(result.documents.length, 0);
    assert.strictEqual(result.gaps.length, 1);
    assert.strictEqual(result.gaps[0].type, 'document');
    assert.strictEqual(result.gaps[0].target, 'missing.md');
  } finally {
    fixture.cleanup();
  }
});

test('T14 Provider: DocumentProvider rejects oversized document (>8 KiB)', () => {
  const fixture = createTestFixture();
  try {
    const largeContent = 'A'.repeat(8193);
    fixture.createFile('large.txt', largeContent);

    assert.throws(() => {
      DocumentProvider.collect(
        fixture.workspacePath,
        ['large.txt'],
        ['large.txt']
      );
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.DOCUMENT_TOO_LARGE);
  } finally {
    fixture.cleanup();
  }
});

test('T14 Provider: DocumentProvider rejects binary file containing NUL bytes', () => {
  const fixture = createTestFixture();
  try {
    const binaryWithNul = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f, 0x72, 0x6c, 0x64]);
    const full = fixture.createFile('bad.txt', '');
    writeFileSync(full, binaryWithNul);

    assert.throws(() => {
      DocumentProvider.collect(
        fixture.workspacePath,
        ['bad.txt'],
        ['bad.txt']
      );
    }, (err) => err instanceof VectorForceError && err.code === ErrorCode.INVALID_DOCUMENT_CONTENT);
  } finally {
    fixture.cleanup();
  }
});

test('T14 Provider: GitProvider returns metadata or records clean gap', () => {
  const fixture = createTestFixture();
  try {
    const res = GitProvider.collect(fixture.workspacePath);
    // Temp workspace is not a git repo, so it should cleanly return gap without throwing
    assert.strictEqual(res.git, null);
    assert.ok(res.gap);
    assert.strictEqual(res.gap.type, 'git');
  } finally {
    fixture.cleanup();
  }
});
