import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ErrorCode, VectorForceError } from '../core/errors.js';

export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
export const DEFAULT_OLLAMA_MODEL = 'llama3.1:8b';
export const DEFAULT_CLOUD_MODEL = 'llama-3.3-70b-versatile';
export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_OPENROUTER_MODEL = 'deepseek/deepseek-v4.1-flash-1017';
export const DEFAULT_MUSE_BASE_URL = 'https://api.meta.ai/v1';
export const DEFAULT_MUSE_MODEL = 'muse-spark-1.3';
export const DEFAULT_FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1';
export const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/muse-spark-open';
export const DEFAULT_TIMEOUT_MS = 60000;

function trimTrailingSlash(url) {
  return String(url).replace(/\/+$/, '');
}

/**
 * Read configuration from .vectorforce/config.json or .env in the workspace if present.
 * Zero external dependencies.
 * @param {string|null} workspacePath
 * @returns {Record<string, string>}
 */
export function readStoredConfig(workspacePath) {
  if (!workspacePath || typeof workspacePath !== 'string') return {};
  const candidates = [
    join(workspacePath, '.vectorforce', 'config.json'),
    join(workspacePath, '.env')
  ];

  const merged = {};
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        if (p.endsWith('.json')) {
          const data = JSON.parse(readFileSync(p, 'utf8'));
          if (data && typeof data === 'object') {
            if (data.env && typeof data.env === 'object') {
              Object.assign(merged, data.env);
            }
            if (data.llm && typeof data.llm === 'object') {
              if (data.llm.provider) merged.VF_LLM_PROVIDER = data.llm.provider;
              if (data.llm.provider === 'muse' || data.llm.provider === 'muse-code') {
                if (data.llm.apiKey) {
                  merged.MODEL_API_KEY = data.llm.apiKey;
                  merged.MUSE_API_KEY = data.llm.apiKey;
                  merged.VF_MUSE_API_KEY = data.llm.apiKey;
                  merged.VF_LLM_API_KEY = data.llm.apiKey;
                }
                if (data.llm.model) merged.VF_MUSE_MODEL = data.llm.model;
                if (data.llm.baseUrl) merged.VF_MUSE_BASE_URL = data.llm.baseUrl;
              } else {
                if (data.llm.apiKey) {
                  merged.OPENROUTER_API_KEY = data.llm.apiKey;
                  merged.VF_OPENROUTER_API_KEY = data.llm.apiKey;
                  merged.VF_LLM_API_KEY = data.llm.apiKey;
                }
                if (data.llm.model) merged.VF_OPENROUTER_MODEL = data.llm.model;
                if (data.llm.baseUrl) merged.VF_OPENROUTER_BASE_URL = data.llm.baseUrl;
              }
            }
            for (const [k, v] of Object.entries(data)) {
              if (typeof v === 'string') merged[k] = v;
            }
          }
        } else if (p.endsWith('.env')) {
          const lines = readFileSync(p, 'utf8').split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq > 0) {
              const k = trimmed.slice(0, eq).trim();
              let v = trimmed.slice(eq + 1).trim();
              if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                v = v.slice(1, -1);
              }
              merged[k] = v;
            }
          }
        }
      }
    } catch {}
  }
  return merged;
}

/**
 * Resolve LLM provider configuration from explicit overrides, environment, then defaults.
 * Supports OpenRouter and OpenAI/Codex (OpenAI-compatible /chat/completions), the Meta
 * Muse API (Responses API at api.meta.ai/v1/responses), and a local Ollama runtime.
 *
 * @param {Record<string, string|undefined>} [env]
 * @param {object} [overrides]
 * @param {string} [workspacePath]
 * @returns {{ provider: string, baseUrl: string, apiKey: string|null, model: string, timeoutMs: number }}
 */
export function resolveLlmConfig(env = process.env, overrides = {}, workspacePath = null) {
  const stored = readStoredConfig(workspacePath || (env && env.VF_WORKSPACE ? env.VF_WORKSPACE : null));
  const mergedEnv = { ...stored, ...(env || {}) };

  const provider = (
    overrides.provider ||
    mergedEnv.VF_LLM_PROVIDER ||
    (mergedEnv.FIREWORKS_API_KEY || mergedEnv.VF_FIREWORKS_API_KEY ? 'fireworks' :
    (mergedEnv.OPENROUTER_API_KEY || mergedEnv.VF_OPENROUTER_API_KEY ? 'openrouter' :
    (mergedEnv.VF_CODEX_API_KEY ? 'codex' :
    (mergedEnv.MODEL_API_KEY || mergedEnv.MUSE_API_KEY || mergedEnv.VF_MUSE_API_KEY ? 'muse' :
    (mergedEnv.VF_LLM_API_KEY ? 'openai' : 'ollama')))))
  ).toLowerCase();
  const timeoutMs = overrides.timeoutMs ?? (mergedEnv.VF_LLM_TIMEOUT_MS ? Number(mergedEnv.VF_LLM_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS);

  if (provider === 'ollama') {
    const base = overrides.baseUrl || mergedEnv.VF_OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
    return {
      provider: 'ollama',
      baseUrl: `${trimTrailingSlash(base)}/v1`,
      apiKey: null,
      model: overrides.model || mergedEnv.VF_OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
      timeoutMs
    };
  }

  if (provider === 'fireworks') {
    const baseUrl = trimTrailingSlash(overrides.baseUrl || mergedEnv.VF_FIREWORKS_BASE_URL || mergedEnv.FIREWORKS_BASE_URL || mergedEnv.VF_LLM_BASE_URL || DEFAULT_FIREWORKS_BASE_URL);
    const apiKey = overrides.apiKey ?? mergedEnv.FIREWORKS_API_KEY ?? mergedEnv.VF_FIREWORKS_API_KEY ?? mergedEnv.VF_LLM_API_KEY ?? null;
    const model = overrides.model || mergedEnv.VF_FIREWORKS_MODEL || mergedEnv.FIREWORKS_MODEL || mergedEnv.VF_LLM_MODEL || DEFAULT_FIREWORKS_MODEL;
    if (!apiKey) {
      throw new VectorForceError(ErrorCode.LLM_CONFIG_INVALID, 'Fireworks provider requires FIREWORKS_API_KEY or VF_FIREWORKS_API_KEY');
    }
    return { provider: 'fireworks', baseUrl, apiKey, model, timeoutMs };
  }

  if (provider === 'openrouter') {
    const baseUrl = trimTrailingSlash(overrides.baseUrl || mergedEnv.VF_OPENROUTER_BASE_URL || mergedEnv.OPENROUTER_BASE_URL || mergedEnv.VF_LLM_BASE_URL || DEFAULT_OPENROUTER_BASE_URL);
    const apiKey = overrides.apiKey ?? mergedEnv.OPENROUTER_API_KEY ?? mergedEnv.VF_OPENROUTER_API_KEY ?? mergedEnv.VF_LLM_API_KEY ?? null;
    const model = overrides.model || mergedEnv.VF_OPENROUTER_MODEL || mergedEnv.OPENROUTER_MODEL || mergedEnv.VF_LLM_MODEL || DEFAULT_OPENROUTER_MODEL;
    if (!apiKey) {
      throw new VectorForceError(ErrorCode.LLM_CONFIG_INVALID, 'OpenRouter provider requires OPENROUTER_API_KEY or VF_OPENROUTER_API_KEY');
    }
    return { provider: 'openrouter', baseUrl, apiKey, model, timeoutMs };
  }

  if (provider === 'muse' || provider === 'muse-code') {
    const baseUrl = trimTrailingSlash(overrides.baseUrl || mergedEnv.VF_MUSE_BASE_URL || mergedEnv.MUSE_BASE_URL || mergedEnv.VF_LLM_BASE_URL || DEFAULT_MUSE_BASE_URL);
    const apiKey = overrides.apiKey ?? mergedEnv.MODEL_API_KEY ?? mergedEnv.MUSE_API_KEY ?? mergedEnv.VF_MUSE_API_KEY ?? mergedEnv.VF_LLM_API_KEY ?? null;
    const model = overrides.model || mergedEnv.VF_MUSE_MODEL || mergedEnv.MUSE_MODEL || mergedEnv.VF_LLM_MODEL || DEFAULT_MUSE_MODEL;
    if (!apiKey) {
      throw new VectorForceError(ErrorCode.LLM_CONFIG_INVALID, 'Muse provider requires MODEL_API_KEY (or MUSE_API_KEY / VF_MUSE_API_KEY)');
    }
    return { provider: 'muse', baseUrl, apiKey, model, timeoutMs };
  }

  if (provider === 'openai' || provider === 'codex' || provider === 'anthropic' || provider === 'byok') {
    const defaultBase = provider === 'anthropic' ? 'https://api.anthropic.com/v1' : '';
    const baseUrl = trimTrailingSlash(overrides.baseUrl || mergedEnv.VF_CODEX_BASE_URL || mergedEnv.OPENAI_BASE_URL || mergedEnv.ANTHROPIC_BASE_URL || mergedEnv.VF_LLM_BASE_URL || defaultBase);
    const apiKey = overrides.apiKey ?? mergedEnv.VF_CODEX_API_KEY ?? mergedEnv.OPENAI_API_KEY ?? mergedEnv.ANTHROPIC_API_KEY ?? mergedEnv.VF_LLM_API_KEY ?? null;
    const defaultModel = provider === 'anthropic' ? 'claude-sonnet-4-20250514' : DEFAULT_CLOUD_MODEL;
    const model = overrides.model || mergedEnv.VF_CODEX_MODEL || mergedEnv.VF_LLM_MODEL || defaultModel;
    if (!baseUrl) {
      throw new VectorForceError(
        ErrorCode.LLM_CONFIG_INVALID,
        `Cloud LLM provider (${provider}) requires VF_LLM_BASE_URL or VF_CODEX_BASE_URL (an OpenAI-compatible endpoint)`
      );
    }
    if (!apiKey) {
      throw new VectorForceError(ErrorCode.LLM_CONFIG_INVALID, `Cloud LLM provider (${provider}) requires VF_LLM_API_KEY or VF_CODEX_API_KEY`);
    }
    return { provider, baseUrl, apiKey, model, timeoutMs };
  }

  throw new VectorForceError(
    ErrorCode.LLM_CONFIG_INVALID,
    `Unknown LLM provider '${provider}'. Use 'openrouter', 'muse', 'codex', 'openai', 'anthropic', 'byok' (cloud) or 'ollama' (local).`
  );
}

/**
 * Minimal OpenAI-compatible chat client built on the global fetch.
 * Zero runtime dependencies.
 */
export class LlmProvider {
  /**
   * @param {{ provider: string, baseUrl: string, apiKey?: string|null, model: string, timeoutMs?: number }} config
   */
  constructor(config) {
    if (!config || typeof config !== 'object') {
      throw new VectorForceError(ErrorCode.LLM_CONFIG_INVALID, 'LlmProvider requires a config object');
    }
    const { provider, baseUrl, apiKey = null, model, timeoutMs = DEFAULT_TIMEOUT_MS } = config;
    if (!provider || !baseUrl || !model) {
      throw new VectorForceError(
        ErrorCode.LLM_CONFIG_INVALID,
        'LlmProvider config requires provider, baseUrl, and model'
      );
    }
    this.provider = provider;
    this.baseUrl = trimTrailingSlash(baseUrl);
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    if (this.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/vectorforce/vectorforce';
      headers['X-Title'] = 'VectorForce';
    }
    if (this.provider === 'muse' || this.provider === 'muse-code') {
      headers.Accept = 'text/event-stream';
    }
    return headers;
  }

  get _isMuse() {
    return this.provider === 'muse' || this.provider === 'muse-code';
  }

  /**
   * Extract assistant text and usage from a Meta Responses API payload
   * (either a parsed JSON body or a completed SSE response object).
   * @param {object} payload
   * @returns {{ text: string|null, usage: object|null, model: string|null }}
   */
  static _museResult(payload) {
    if (!payload || typeof payload !== 'object') return { text: null, usage: null, model: null };
    let text = typeof payload.output_text === 'string' ? payload.output_text : null;
    if ((typeof text !== 'string' || text.trim().length === 0) && Array.isArray(payload.output)) {
      const parts = [];
      for (const item of payload.output) {
        if (item && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c && (c.type === 'output_text' || c.type === 'text') && typeof c.text === 'string') parts.push(c.text);
          }
        }
      }
      if (parts.length) text = parts.join('');
    }
    return { text, usage: payload.usage || null, model: payload.model || null };
  }

  /**
   * Parse a Responses API SSE stream into assistant text plus the final response object.
   * @param {string} raw
   * @returns {{ text: string|null, usage: object|null, model: string|null }}
   */
  static _parseMuseSse(raw) {
    let deltaText = '';
    let completed = null;
    for (const line of String(raw).split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      let event;
      try { event = JSON.parse(data); } catch { continue; }
      if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
        deltaText += event.delta;
      } else if (event.type === 'response.completed' && event.response) {
        completed = event.response;
      }
    }
    const fromCompleted = LlmProvider._museResult(completed);
    return {
      text: deltaText.length ? deltaText : fromCompleted.text,
      usage: fromCompleted.usage,
      model: fromCompleted.model
    };
  }

  /**
   * Run a single chat completion.
   * @param {object} params
   * @param {string} params.system
   * @param {string} params.user
   * @param {number} [params.temperature=0.2]
   * @param {number} [params.maxTokens=4000]
   * @param {string} [params.model] Override the configured model id
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<{ text: string, model: string, provider: string, usage: object|null }>}
   */
  async complete({ system, user, temperature = 0.2, maxTokens = 4000, model, signal } = {}) {
    if (typeof system !== 'string' || typeof user !== 'string') {
      throw new VectorForceError(ErrorCode.LLM_CONFIG_INVALID, 'complete() requires string system and user prompts');
    }
    if (typeof fetch !== 'function') {
      throw new VectorForceError(ErrorCode.LLM_UNAVAILABLE, 'Global fetch is unavailable in this Node runtime');
    }

    const activeModel = model || this.model;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const isMuse = this._isMuse;
    const url = isMuse ? `${this.baseUrl}/responses` : `${this.baseUrl}/chat/completions`;
    const requestBody = isMuse
      ? {
          model: activeModel,
          input: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          stream: true,
          temperature,
          max_output_tokens: maxTokens,
          top_p: 1,
          reasoning: { effort: 'medium' }
        }
      : {
          model: activeModel,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature,
          max_tokens: maxTokens
        };

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new VectorForceError(
          ErrorCode.LLM_REQUEST_FAILED,
          `LLM request timed out after ${this.timeoutMs}ms`
        );
      }
      const cause = err && err.cause ? ` [cause: ${err.cause.code || err.cause.message || err.cause}]` : '';
      throw new VectorForceError(
        ErrorCode.LLM_UNAVAILABLE,
        `Cannot reach LLM provider at ${this.baseUrl}: ${err && err.message ? err.message : err}${cause}`
      );
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
    }

    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        /* ignore body read errors */
      }
      throw new VectorForceError(
        ErrorCode.LLM_REQUEST_FAILED,
        `LLM provider returned ${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 300)}` : ''}`
      );
    }

    if (isMuse) {
      let raw;
      try {
        raw = await response.text();
      } catch (err) {
        throw new VectorForceError(
          ErrorCode.LLM_RESPONSE_INVALID,
          `Muse provider returned an unreadable response: ${err && err.message ? err.message : err}`
        );
      }
      let result = LlmProvider._parseMuseSse(raw);
      if (typeof result.text !== 'string' || result.text.trim().length === 0) {
        try {
          result = LlmProvider._museResult(JSON.parse(raw));
        } catch {
          /* fall through to the invalid-response error below */
        }
      }
      if (typeof result.text !== 'string' || result.text.trim().length === 0) {
        throw new VectorForceError(ErrorCode.LLM_RESPONSE_INVALID, 'Muse response missing output text');
      }
      return {
        text: result.text.trim(),
        model: result.model || activeModel,
        provider: this.provider,
        usage: result.usage || null
      };
    }

    let payload;
    try {
      payload = await response.json();
    } catch (err) {
      throw new VectorForceError(
        ErrorCode.LLM_RESPONSE_INVALID,
        `LLM provider returned a non-JSON response: ${err && err.message ? err.message : err}`
      );
    }

    let text = payload && payload.choices && payload.choices[0] && payload.choices[0].message
      ? payload.choices[0].message.content
      : null;
    if ((typeof text !== 'string' || text.trim().length === 0) && payload?.choices?.[0]?.message?.reasoning) {
      text = payload.choices[0].message.reasoning;
    }
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new VectorForceError(ErrorCode.LLM_RESPONSE_INVALID, 'LLM response missing choices[0].message.content');
    }

    return {
      text: text.trim(),
      model: payload.model || activeModel,
      provider: this.provider,
      usage: payload.usage || null
    };
  }
}
