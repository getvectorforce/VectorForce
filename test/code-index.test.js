import test from 'node:test';
import assert from 'node:assert';
import { symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createTestFixture } from './helpers/fixtures.js';
import { CodeIndexProvider } from '../src/providers/code-index-provider.js';
import { Authorizer } from '../src/policy/authorizer.js';

test('code-index: extracts symbols and import edges', () => {
  const fixture = createTestFixture();
  try {
    fixture.createFile('src/a.js', "import { b } from './b.js';\nexport function alpha() {}\n");
    fixture.createFile('src/b.js', 'export const b = 1;\nclass Beta {}\n');

    const index = CodeIndexProvider.build(fixture.workspacePath);
    const a = index.files.find(f => f.path === 'src/a.js');
    assert.ok(a, 'expected src/a.js to be indexed');
    assert.ok(a.symbols.imports.includes('./b.js'));
    assert.ok(a.symbols.exports.includes('alpha'));
    assert.ok(index.edges.some(e => e.from === 'src/a.js' && e.to === 'src/b.js'));
    assert.ok(a.sha256.length === 64);
  } finally {
    fixture.cleanup();
  }
});

test('code-index: skips ignored dirs, secrets, and symlinks', () => {
  const fixture = createTestFixture();
  try {
    fixture.createFile('keep.js', 'export function keep() {}');
    fixture.createFile('node_modules/pkg/index.js', 'export function nope() {}');
    fixture.createFile('.git/secret.js', 'export function nope() {}');
    fixture.createFile('.env', 'SECRET=1');
    fixture.createFile('server.pem', 'x');
    fixture.createFile('real.js', 'export function r() {}');
    try {
      symlinkSync(join(fixture.workspacePath, 'real.js'), join(fixture.workspacePath, 'link.js'));
    } catch {
      /* symlinks may be unavailable in some environments */
    }

    const paths = CodeIndexProvider.build(fixture.workspacePath).files.map(f => f.path);
    assert.ok(paths.includes('keep.js'));
    assert.ok(paths.includes('real.js'));
    assert.ok(!paths.includes('node_modules/pkg/index.js'));
    assert.ok(!paths.includes('.git/secret.js'));
    assert.ok(!paths.includes('.env'));
    assert.ok(!paths.includes('server.pem'));
    assert.ok(!paths.includes('link.js'));
  } finally {
    fixture.cleanup();
  }
});

test('code-index: records an explicit gap for oversized files', () => {
  const fixture = createTestFixture();
  try {
    fixture.createFile('big.js', 'x'.repeat(50));
    const index = CodeIndexProvider.build(fixture.workspacePath, { maxFileBytes: 10 });
    assert.strictEqual(index.files.length, 0);
    assert.ok(index.gaps.some(g => g.target === 'big.js'));
  } finally {
    fixture.cleanup();
  }
});

test('code-index: selectRelevantFiles ranks changed files above token matches', () => {
  const index = {
    files: [
      { path: 'src/auth/login.js', size: 10, sha256: 'a', language: 'javascript', symbols: { exports: ['login'], imports: [], functions: ['login'], classes: [] }, snippet: 'login' },
      { path: 'src/billing/invoice.js', size: 10, sha256: 'b', language: 'javascript', symbols: { exports: ['invoice'], imports: [], functions: [], classes: [] }, snippet: 'invoice' }
    ],
    edges: [],
    truncated: false,
    gaps: []
  };

  const byToken = CodeIndexProvider.selectRelevantFiles(index, { queryTokens: ['login'] });
  assert.strictEqual(byToken.files[0].path, 'src/auth/login.js');

  const byChanged = CodeIndexProvider.selectRelevantFiles(index, { queryTokens: ['login'], changedFiles: ['src/billing/invoice.js'] });
  assert.strictEqual(byChanged.files[0].path, 'src/billing/invoice.js');
  assert.strictEqual(byChanged.files[0].changed, true);
});

test('code-index: tokenize removes stopwords and short tokens', () => {
  const tokens = CodeIndexProvider.tokenize('The OAuth login flow', 'authentication service');
  assert.ok(tokens.includes('oauth'));
  assert.ok(tokens.includes('login'));
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('and'));
});

test('authorizer: isWithinWorkspace enforces containment', () => {
  const fixture = createTestFixture();
  try {
    const inside = fixture.createFile('src/x.js', 'x');
    assert.strictEqual(Authorizer.isWithinWorkspace(fixture.workspacePath, inside), true);
    assert.strictEqual(Authorizer.isWithinWorkspace(fixture.workspacePath, '/etc/passwd'), false);
  } finally {
    fixture.cleanup();
  }
});
