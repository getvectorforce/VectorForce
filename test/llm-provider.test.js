import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  LlmProvider,
  resolveLlmConfig,
  DEFAULT_CLOUD_MODEL,
  DEFAULT_MUSE_BASE_URL,
  DEFAULT_MUSE_MODEL,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL
} from '../src/providers/llm-provider.js';
import { ErrorCode, VectorForceError } from '../src/core/errors.js';

async function withFetchStub(stub, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

function okResponse(payload) {
  return { ok: true, status: 200, statusText: 'OK', json: async () => payload };
}

test('llm: resolveLlmConfig defaults to ollama when no cloud key is present', () => {
  const cfg = resolveLlmConfig({}, {});
  assert.strictEqual(cfg.provider, 'ollama');
  assert.ok(cfg.baseUrl.endsWith('/v1'));
  assert.strictEqual(cfg.apiKey, null);
});

test('llm: resolveLlmConfig selects openai when VF_LLM_API_KEY is present', () => {
  const cfg = resolveLlmConfig({ VF_LLM_API_KEY: 'k', VF_LLM_BASE_URL: 'https://example.com/v1' }, {});
  assert.strictEqual(cfg.provider, 'openai');
  assert.strictEqual(cfg.model, DEFAULT_CLOUD_MODEL);
  assert.strictEqual(cfg.baseUrl, 'https://example.com/v1');
});

test('llm: resolveLlmConfig selects codex when VF_CODEX_API_KEY is present', () => {
  const cfg = resolveLlmConfig({ VF_CODEX_API_KEY: 'k', VF_CODEX_BASE_URL: 'https://api.openai.com/v1' }, {});
  assert.strictEqual(cfg.provider, 'codex');
  assert.strictEqual(cfg.model, DEFAULT_CLOUD_MODEL);
  assert.strictEqual(cfg.baseUrl, 'https://api.openai.com/v1');
});

test('llm: resolveLlmConfig selects openrouter with DeepSeek default when OPENROUTER_API_KEY is present', () => {
  const cfg = resolveLlmConfig({ OPENROUTER_API_KEY: 'sk-or-test' }, {});
  assert.strictEqual(cfg.provider, 'openrouter');
  assert.strictEqual(cfg.model, 'deepseek/deepseek-v4.1-flash-1017');
  assert.strictEqual(cfg.baseUrl, 'https://openrouter.ai/api/v1');
  assert.strictEqual(cfg.apiKey, 'sk-or-test');
});

test('llm: resolveLlmConfig rejects openrouter without an API key', () => {
  assert.throws(
    () => resolveLlmConfig({ VF_LLM_PROVIDER: 'openrouter' }, {}),
    err => err instanceof VectorForceError && err.code === ErrorCode.LLM_CONFIG_INVALID
  );
});

test('llm: resolveLlmConfig selects muse with Muse Spark default when MODEL_API_KEY is present', () => {
  const cfg = resolveLlmConfig({ MODEL_API_KEY: 'sk-muse-test' }, {});
  assert.strictEqual(cfg.provider, 'muse');
  assert.strictEqual(cfg.model, 'muse-spark-1.3');
  assert.strictEqual(cfg.model, DEFAULT_MUSE_MODEL);
  assert.strictEqual(cfg.baseUrl, 'https://api.meta.ai/v1');
  assert.strictEqual(cfg.baseUrl, DEFAULT_MUSE_BASE_URL);
  assert.strictEqual(cfg.apiKey, 'sk-muse-test');
});

test('llm: resolveLlmConfig rejects muse without an API key', () => {
  assert.throws(
    () => resolveLlmConfig({ VF_LLM_PROVIDER: 'muse' }, {}),
    err => err instanceof VectorForceError && err.code === ErrorCode.LLM_CONFIG_INVALID
  );
});

test('llm: resolveLlmConfig honors a muse base url override', () => {
  const cfg = resolveLlmConfig({ MODEL_API_KEY: 'sk-muse-test', VF_MUSE_BASE_URL: 'https://api.example.com/v1/' }, {});
  assert.strictEqual(cfg.provider, 'muse');
  assert.strictEqual(cfg.baseUrl, 'https://api.example.com/v1');
});

test('llm: resolveLlmConfig rejects a cloud provider without a base url', () => {
  assert.throws(
    () => resolveLlmConfig({ VF_LLM_PROVIDER: 'openai', VF_LLM_API_KEY: 'k' }, {}),
    err => err instanceof VectorForceError && err.code === ErrorCode.LLM_CONFIG_INVALID
  );
});

test('llm: resolveLlmConfig rejects an unknown provider', () => {
  assert.throws(
    () => resolveLlmConfig({ VF_LLM_PROVIDER: 'mystery' }, {}),
    err => err instanceof VectorForceError && err.code === ErrorCode.LLM_CONFIG_INVALID
  );
});

test('llm: cloud request carries Authorization, model, and messages', async () => {
  const provider = new LlmProvider({ provider: 'openai', baseUrl: 'https://api.example.com/v1', apiKey: 'secret', model: 'llama-x' });
  let captured;
  await withFetchStub(
    async (url, init) => {
      captured = { url, init };
      return okResponse({ model: 'llama-x', choices: [{ message: { content: '  hello  ' } }], usage: { total_tokens: 5 } });
    },
    async () => {
      const res = await provider.complete({ system: 'sys', user: 'usr' });
      assert.strictEqual(res.text, 'hello');
      assert.strictEqual(res.provider, 'openai');
    }
  );

  assert.strictEqual(captured.url, 'https://api.example.com/v1/chat/completions');
  assert.strictEqual(captured.init.headers.Authorization, 'Bearer secret');
  const body = JSON.parse(captured.init.body);
  assert.strictEqual(body.model, 'llama-x');
  assert.deepStrictEqual(body.messages.map(m => m.role), ['system', 'user']);
});

test('llm: openrouter request carries Authorization, HTTP-Referer, and deepseek model', async () => {
  const cfg = resolveLlmConfig({ OPENROUTER_API_KEY: 'sk-or-deepseek' }, {});
  const provider = new LlmProvider(cfg);
  let captured;
  await withFetchStub(
    async (url, init) => {
      captured = { url, init };
      return okResponse({
        model: 'deepseek/deepseek-v4.1-flash-1017',
        choices: [{ message: { content: 'DeepSeek narrative response' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });
    },
    async () => {
      const res = await provider.complete({ system: 'system prompt', user: 'user prompt' });
      assert.strictEqual(res.text, 'DeepSeek narrative response');
      assert.strictEqual(res.provider, 'openrouter');
      assert.strictEqual(res.model, 'deepseek/deepseek-v4.1-flash-1017');
      assert.strictEqual(res.usage.total_tokens, 150);
    }
  );

  assert.strictEqual(captured.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.strictEqual(captured.init.headers.Authorization, 'Bearer sk-or-deepseek');
  assert.strictEqual(captured.init.headers['HTTP-Referer'], 'https://github.com/vectorforce/vectorforce');
  assert.strictEqual(captured.init.headers['X-Title'], 'VectorForce');
  const body = JSON.parse(captured.init.body);
  assert.strictEqual(body.model, 'deepseek/deepseek-v4.1-flash-1017');
});

function sseResponse(events) {
  const raw = events.map(e => `data: ${JSON.stringify(e)}`).join('\n') + '\ndata: [DONE]';
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => raw,
    json: async () => { throw new Error('SSE body is not JSON'); }
  };
}

test('llm: muse request posts Responses API body to /responses and parses SSE deltas', async () => {
  const cfg = resolveLlmConfig({ MODEL_API_KEY: 'muse-test-key' }, {});
  const provider = new LlmProvider(cfg);
  let captured;
  await withFetchStub(
    async (url, init) => {
      captured = { url, init };
      return sseResponse([
        { type: 'response.output_text.delta', delta: 'Muse narrative ' },
        { type: 'response.output_text.delta', delta: 'response' },
        {
          type: 'response.completed',
          response: {
            model: 'muse-spark-1.3',
            output: [{ type: 'message', content: [{ type: 'output_text', text: 'Muse narrative response' }] }],
            usage: { input_tokens: 80, output_tokens: 40, total_tokens: 120 }
          }
        }
      ]);
    },
    async () => {
      const res = await provider.complete({ system: 'system prompt', user: 'user prompt' });
      assert.strictEqual(res.text, 'Muse narrative response');
      assert.strictEqual(res.provider, 'muse');
      assert.strictEqual(res.model, 'muse-spark-1.3');
      assert.strictEqual(res.usage.total_tokens, 120);
    }
  );

  assert.strictEqual(captured.url, 'https://api.meta.ai/v1/responses');
  assert.strictEqual(captured.init.headers.Authorization, 'Bearer muse-test-key');
  assert.strictEqual(captured.init.headers.Accept, 'text/event-stream');
  const body = JSON.parse(captured.init.body);
  assert.strictEqual(body.model, 'muse-spark-1.3');
  assert.strictEqual(body.stream, true);
  assert.strictEqual(body.max_output_tokens, 4000);
  assert.deepStrictEqual(body.reasoning, { effort: 'medium' });
  assert.deepStrictEqual(body.input.map(m => m.role), ['system', 'user']);
  assert.deepStrictEqual(body.input.map(m => m.content), ['system prompt', 'user prompt']);
});

test('llm: muse non-stream JSON output_text fallback parses', async () => {
  const cfg = resolveLlmConfig({ MODEL_API_KEY: 'muse-test-key' }, {});
  const provider = new LlmProvider(cfg);
  await withFetchStub(
    async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({
        model: 'muse-spark-1.3',
        output_text: 'Plain JSON response',
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
      })
    }),
    async () => {
      const res = await provider.complete({ system: 's', user: 'u' });
      assert.strictEqual(res.text, 'Plain JSON response');
      assert.strictEqual(res.model, 'muse-spark-1.3');
      assert.strictEqual(res.usage.total_tokens, 15);
    }
  );
});

test('llm: local ollama request omits the Authorization header', async () => {
  const provider = new LlmProvider({ provider: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', apiKey: null, model: 'llama3.1:8b' });
  let captured;
  await withFetchStub(
    async (url, init) => {
      captured = init;
      return okResponse({ choices: [{ message: { content: 'ok' } }] });
    },
    async () => {
      await provider.complete({ system: 's', user: 'u' });
    }
  );
  assert.strictEqual(captured.headers.Authorization, undefined);
});

test('llm: model override is sent on the wire', async () => {
  const provider = new LlmProvider({ provider: 'ollama', baseUrl: 'http://x/v1', model: 'default' });
  let body;
  await withFetchStub(
    async (url, init) => {
      body = JSON.parse(init.body);
      return okResponse({ choices: [{ message: { content: 'ok' } }] });
    },
    async () => {
      await provider.complete({ system: 's', user: 'u', model: 'override-model' });
    }
  );
  assert.strictEqual(body.model, 'override-model');
});

test('llm: non-2xx response throws LLM_REQUEST_FAILED', async () => {
  const provider = new LlmProvider({ provider: 'ollama', baseUrl: 'http://x/v1', model: 'm' });
  await withFetchStub(
    async () => ({ ok: false, status: 500, statusText: 'Server Error', text: async () => 'boom' }),
    async () => {
      await assert.rejects(provider.complete({ system: 's', user: 'u' }), err => err.code === ErrorCode.LLM_REQUEST_FAILED);
    }
  );
});

test('llm: malformed body throws LLM_RESPONSE_INVALID', async () => {
  const provider = new LlmProvider({ provider: 'ollama', baseUrl: 'http://x/v1', model: 'm' });
  await withFetchStub(
    async () => okResponse({ choices: [] }),
    async () => {
      await assert.rejects(provider.complete({ system: 's', user: 'u' }), err => err.code === ErrorCode.LLM_RESPONSE_INVALID);
    }
  );
});

test('llm: network failure throws LLM_UNAVAILABLE', async () => {
  const provider = new LlmProvider({ provider: 'ollama', baseUrl: 'http://x/v1', model: 'm' });
  await withFetchStub(
    async () => {
      throw new Error('ECONNREFUSED');
    },
    async () => {
      await assert.rejects(provider.complete({ system: 's', user: 'u' }), err => err.code === ErrorCode.LLM_UNAVAILABLE);
    }
  );
});

test('llm: resolveLlmConfig loads OpenRouter configuration from .vectorforce/config.json in workspace', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'vf-cfg-test-'));
  try {
    const vfDir = join(tmpDir, '.vectorforce');
    mkdirSync(vfDir, { recursive: true });
    writeFileSync(join(vfDir, 'config.json'), JSON.stringify({
      VF_LLM_PROVIDER: 'openrouter',
      OPENROUTER_API_KEY: 'sk-or-saved',
      VF_OPENROUTER_MODEL: 'deepseek/deepseek-v4.1-flash-1017'
    }));

    const cfg = resolveLlmConfig({}, {}, tmpDir);
    assert.strictEqual(cfg.provider, 'openrouter');
    assert.strictEqual(cfg.apiKey, 'sk-or-saved');
    assert.strictEqual(cfg.model, 'deepseek/deepseek-v4.1-flash-1017');
    assert.strictEqual(cfg.baseUrl, 'https://openrouter.ai/api/v1');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('llm: resolveLlmConfig loads Muse configuration from .vectorforce/config.json in workspace', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'vf-cfg-test-'));
  try {
    const vfDir = join(tmpDir, '.vectorforce');
    mkdirSync(vfDir, { recursive: true });
    writeFileSync(join(vfDir, 'config.json'), JSON.stringify({
      VF_LLM_PROVIDER: 'muse',
      MODEL_API_KEY: 'muse-config-key',
      VF_MUSE_MODEL: 'muse-spark-1.3'
    }));

    const cfg = resolveLlmConfig({}, {}, tmpDir);
    assert.strictEqual(cfg.provider, 'muse');
    assert.strictEqual(cfg.apiKey, 'muse-config-key');
    assert.strictEqual(cfg.model, 'muse-spark-1.3');
    assert.strictEqual(cfg.baseUrl, 'https://api.meta.ai/v1');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
