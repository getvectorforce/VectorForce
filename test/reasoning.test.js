import test from 'node:test';
import assert from 'node:assert';
import { createTestFixture, FakeLlmProvider } from './helpers/fixtures.js';
import { buildPromptBundle, renderBundleForPrompt } from '../src/operations/reasoning-service.js';

function seed(fixture, overrides = {}) {
  fixture.projectService.initProject(fixture.workspacePath);
  fixture.projectService.createTask(fixture.workspacePath, 'auth-task', 'Auth Task');
  return fixture.checkpointService.captureCheckpoint({
    workspacePath: fixture.workspacePath,
    taskId: 'auth-task',
    summary: 'Implemented the login endpoint',
    goals: ['Add OAuth login'],
    constraints: ['No third-party auth libraries'],
    decisions: [{ id: 'DEC-1', title: 'Use JWT', rationale: 'Stateless sessions' }],
    nextSteps: ['Add refresh tokens'],
    openQuestions: ['Token expiry policy?'],
    includeGit: false,
    authorName: 'tester',
    authorHarness: 'cli',
    ...overrides
  });
}

test('reasoning: returns a narrative and grounds the prompt in memory + code', async () => {
  const fake = new FakeLlmProvider({ text: '## Where you left off\nAll caught up.' });
  const fixture = createTestFixture({ llmProvider: fake });
  try {
    fixture.createFile('src/auth.js', 'export function login() {}\n');
    seed(fixture);

    const result = await fixture.reasoningService.reasonAboutTask({
      workspacePath: fixture.workspacePath,
      taskId: 'auth-task'
    });

    assert.strictEqual(result.degraded, false);
    assert.strictEqual(result.provider, 'fake');
    assert.ok(result.narrativeText.includes('Where you left off'));
    assert.ok(result.codeFilesConsidered >= 1);

    const prompt = fake.calls[0].user;
    assert.ok(prompt.includes('[CLAIMS]'), 'prompt labels claims');
    assert.ok(prompt.includes('[EVIDENCE: DRIFT]'), 'prompt labels drift evidence');
    assert.ok(prompt.includes('[EVIDENCE: GIT]'));
    assert.ok(prompt.includes('[CODE: RELEVANT FILES]'), 'prompt includes code context');
    assert.ok(prompt.includes('src/auth.js'), 'prompt includes the relevant file');
    assert.ok(prompt.includes('DEC-1'));
    assert.ok(prompt.includes('No third-party auth libraries'));
  } finally {
    fixture.cleanup();
  }
});

test('reasoning: degrades to the deterministic briefing when the provider fails', async () => {
  const fake = new FakeLlmProvider({ fail: new Error('boom') });
  const fixture = createTestFixture({ llmProvider: fake });
  try {
    seed(fixture);

    const result = await fixture.reasoningService.reasonAboutTask({
      workspacePath: fixture.workspacePath,
      taskId: 'auth-task'
    });

    assert.strictEqual(result.degraded, true);
    assert.strictEqual(result.error, 'boom');
    assert.ok(result.narrativeText.includes('AI reasoning unavailable'));
    assert.ok(result.narrativeText.includes('## Invariant Constraints (Non-Negotiable)'));
  } finally {
    fixture.cleanup();
  }
});

test('reasoning: works with no LLM provider configured', async () => {
  const fixture = createTestFixture({ llmProvider: null });
  try {
    seed(fixture);

    const result = await fixture.reasoningService.reasonAboutTask({
      workspacePath: fixture.workspacePath,
      taskId: 'auth-task'
    });

    assert.strictEqual(result.degraded, true);
    assert.strictEqual(result.provider, null);
    assert.ok(result.narrativeText.includes('no LLM provider configured'));
  } finally {
    fixture.cleanup();
  }
});

test('reasoning: focus question is placed in the prompt', async () => {
  const fake = new FakeLlmProvider();
  const fixture = createTestFixture({ llmProvider: fake });
  try {
    seed(fixture);

    await fixture.reasoningService.reasonAboutTask({
      workspacePath: fixture.workspacePath,
      taskId: 'auth-task',
      focus: 'what blocks refresh tokens?'
    });

    assert.ok(fake.calls[0].user.includes('[FOCUS] what blocks refresh tokens?'));
  } finally {
    fixture.cleanup();
  }
});

test('reasoning: includeCode=false omits the code sections', async () => {
  const fake = new FakeLlmProvider();
  const fixture = createTestFixture({ llmProvider: fake });
  try {
    fixture.createFile('src/auth.js', 'export function login() {}\n');
    seed(fixture, { summary: 'second checkpoint please' });

    await fixture.reasoningService.reasonAboutTask({
      workspacePath: fixture.workspacePath,
      taskId: 'auth-task',
      includeCode: false
    });

    assert.ok(!fake.calls[0].user.includes('[CODE: RELEVANT FILES]'));
  } finally {
    fixture.cleanup();
  }
});

test('reasoning: renderBundleForPrompt separates claims from evidence', () => {
  const bundle = buildPromptBundle({
    project: { name: 'demo', project_id: 'proj-abc' },
    task: { task_id: 't', title: 'T' },
    checkpoint: {
      checkpoint_id: 'cp-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      summary: 'did work',
      claims: { goals: ['g'], constraints: ['c'], decisions: [{ id: 'D1', title: 'T1', rationale: 'r' }], next_steps: ['n'], open_questions: ['q'] },
      evidence: { git: null, documents: [], gaps: [] }
    },
    timeline: [],
    drift: { detected: true, warnings: ['Git commit has drifted'] },
    code: null,
    focus: null,
    includeDocs: false
  });

  const text = renderBundleForPrompt(bundle);
  assert.ok(text.includes('[CLAIMS] Unverified'));
  assert.ok(text.includes('[EVIDENCE: DRIFT] detected: true'));
  assert.ok(text.includes('- Git commit has drifted'));
  assert.ok(text.includes('[EVIDENCE: GIT] (not recorded)'));
});
