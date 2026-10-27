import { mkdtempSync, rmSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { SqliteStore } from '../../src/storage/sqlite-store.js';
import { ProjectService } from '../../src/operations/project-service.js';
import { CheckpointService } from '../../src/operations/checkpoint-service.js';
import { BriefingService } from '../../src/operations/briefing-service.js';
import { ReasoningService } from '../../src/operations/reasoning-service.js';
import { CodeIndexProvider } from '../../src/providers/code-index-provider.js';

/**
 * Deterministic in-memory LLM stand-in so tests never touch the network.
 */
export class FakeLlmProvider {
  constructor({ text = '## Where you left off\n(mock narrative)', fail = null, provider = 'fake', model = 'fake-model' } = {}) {
    this.text = text;
    this.fail = fail;
    this.provider = provider;
    this.model = model;
    this.calls = [];
  }

  async complete(params) {
    this.calls.push(params);
    if (this.fail) throw this.fail;
    return { text: this.text, model: params.model || this.model, provider: this.provider, usage: null };
  }
}

export function createTestFixture(options = {}) {
  const rawTempDir = mkdtempSync(join(tmpdir(), 'vf-test-'));
  const tempDir = realpathSync(rawTempDir);
  const dbPath = join(tempDir, 'test.db');
  const workspacePath = join(tempDir, 'workspace');
  mkdirSync(workspacePath, { recursive: true });

  const store = new SqliteStore(dbPath);
  const projectService = new ProjectService(store);
  const checkpointService = new CheckpointService(store, projectService);
  const briefingService = new BriefingService(store, projectService);
  const llmProvider = options.llmProvider === undefined ? new FakeLlmProvider() : options.llmProvider;
  const codeIndexProvider = options.codeIndexProvider || CodeIndexProvider;
  const reasoningService = new ReasoningService(store, projectService, briefingService, {
    llmProvider,
    codeIndexProvider
  });

  return {
    tempDir,
    dbPath,
    workspacePath,
    store,
    projectService,
    checkpointService,
    briefingService,
    llmProvider,
    reasoningService,
    createFile(relPath, content) {
      const full = join(workspacePath, relPath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content, 'utf8');
      return full;
    },
    cleanup() {
      try {
        store.close();
      } catch {}
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  };
}
