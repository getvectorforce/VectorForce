import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Cpu,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Sun,
  Moon,
  Palette,
  Plus,
  Trash2,
  RefreshCw,
  Key,
  Sparkles,
  Layers
} from 'lucide-react';

const PROVIDER_PRESETS = [
  {
    id: 'fireworks',
    label: 'Fireworks AI (Muse Spark Open)',
    badge: '#1 Hackathon Priority',
    model: 'accounts/fireworks/models/muse-spark-open',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    needsKey: true
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (Muse Spark Open)',
    badge: 'Open Weights',
    model: 'meta/muse-spark-open',
    baseUrl: 'https://openrouter.ai/api/v1',
    needsKey: true
  },
  {
    id: 'muse',
    label: 'Meta Muse Direct API',
    badge: 'Official API',
    model: 'muse-spark-1.3',
    baseUrl: 'https://api.meta.ai/v1',
    needsKey: true
  },
  {
    id: 'ollama',
    label: 'Local Ollama (100% Private)',
    badge: 'Zero API Key',
    model: 'llama3.3',
    baseUrl: 'http://127.0.0.1:11434',
    needsKey: false
  },
  {
    id: 'openai',
    label: 'OpenAI / Codex',
    badge: 'Cloud',
    model: 'gpt-4.1',
    baseUrl: 'https://api.openai.com/v1',
    needsKey: true
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    badge: 'Cloud',
    model: 'claude-sonnet-4-5',
    baseUrl: 'https://api.anthropic.com/v1',
    needsKey: true
  },
  {
    id: 'byok',
    label: 'Custom BYOK (vLLM / Groq / Together)',
    badge: 'Custom URL',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    baseUrl: 'https://api.groq.com/openai/v1',
    needsKey: true
  }
];

export default function SettingsView({ projectData, theme, onToggleTheme, onRefreshData }) {
  const [provider, setProvider] = useState(projectData?.ai?.provider || 'fireworks');
  const [model, setModel] = useState(projectData?.ai?.model || 'accounts/fireworks/models/muse-spark-open');
  const [baseUrl, setBaseUrl] = useState(projectData?.ai?.baseUrl || 'https://api.fireworks.ai/inference/v1');
  const [apiKey, setApiKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [isSavingLlm, setIsSavingLlm] = useState(false);
  const [llmFeedback, setLlmFeedback] = useState(null);

  const [allowedDocs, setAllowedDocs] = useState(projectData?.allowedDocuments || ['AGENTS.md']);
  const [newDocPath, setNewDocPath] = useState('');
  const [policyFeedback, setPolicyFeedback] = useState(null);

  const [isSyncingHarnesses, setIsSyncingHarnesses] = useState(false);
  const [harnessResult, setHarnessResult] = useState(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const [llmRes, memRes] = await Promise.all([
          fetch('/api/config/llm').catch(() => null),
          fetch('/api/memory').catch(() => null)
        ]);
        if (llmRes && llmRes.ok) {
          const cfg = await llmRes.json();
          setProvider(cfg.provider || 'ollama');
          setModel(cfg.model || 'llama3.3');
          setBaseUrl(cfg.baseUrl || 'http://127.0.0.1:11434');
          setHasSavedKey(Boolean(cfg.hasApiKey));
        }
        if (memRes && memRes.ok) {
          const mem = await memRes.json();
          if (Array.isArray(mem.allowedDocuments)) {
            setAllowedDocs(mem.allowedDocuments);
          }
        }
      } catch {}
    }
    fetchSettings();
  }, []);

  const handleSelectPreset = (preset) => {
    setProvider(preset.id);
    setModel(preset.model);
    setBaseUrl(preset.baseUrl);
    setLlmFeedback(null);
  };

  const handleSaveLlm = async (e) => {
    e.preventDefault();
    setIsSavingLlm(true);
    setLlmFeedback(null);
    try {
      const res = await fetch('/api/config/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, baseUrl, apiKey })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setHasSavedKey(Boolean(data.hasApiKey));
        setApiKey('');
        setLlmFeedback({
          type: 'success',
          text: `Saved & activated ${data.provider} (${data.model}) in .vectorforce/config.json`
        });
        if (onRefreshData) onRefreshData();
      } else {
        setLlmFeedback({ type: 'error', text: data.error || 'Failed to save configuration' });
      }
    } catch (err) {
      setLlmFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSavingLlm(false);
    }
  };

  const handleAddDoc = async (docToAdd) => {
    const target = String(docToAdd || newDocPath).trim();
    if (!target) return;
    setPolicyFeedback(null);
    try {
      const res = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: target })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAllowedDocs(data.allowedDocuments);
        setNewDocPath('');
        setPolicyFeedback(`Added "${target}" to document allowlist.`);
        if (onRefreshData) onRefreshData();
      }
    } catch {}
  };

  const handleRemoveDoc = async (docPath) => {
    try {
      const res = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', path: docPath })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAllowedDocs(data.allowedDocuments);
        setPolicyFeedback(`Removed "${docPath}" from allowlist.`);
        if (onRefreshData) onRefreshData();
      }
    } catch {}
  };

  const handleSyncHarnesses = async () => {
    setIsSyncingHarnesses(true);
    try {
      const res = await fetch('/api/config/harnesses', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setHarnessResult(data.installed || []);
      }
    } catch {} finally {
      setIsSyncingHarnesses(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Studio Interactive Control &amp; Configuration
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure AI reasoning models (Meta Muse Spark Open, Fireworks, OpenRouter, Ollama, OpenAI, Anthropic, BYOK), document policies, and MCP client configs directly from the UI.
          </p>
        </div>
      </div>

      {/* Section 1: Interactive AI Model & Provider Configuration */}
      <div className="p-6 rounded-2xl glass-panel space-y-5 border border-indigo-500/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">
              1. AI Reasoning Model Configuration (No CLI Typing Required)
            </h2>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active: {provider} · {model}
          </span>
        </div>

        {/* Provider Preset Grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Select AI Provider Preset (Click to autofill):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PROVIDER_PRESETS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">{p.label}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 shrink-0">
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 truncate mt-1">{p.model}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editable Form */}
        <form onSubmit={handleSaveLlm} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Provider ID:</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Model Identifier:</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="accounts/fireworks/models/muse-spark-open"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">API Base URL:</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.fireworks.ai/inference/v1"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 text-xs">
            <div className="flex-1 space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  API Key {provider === 'ollama' ? '(Not required for Local Ollama)' : hasSavedKey ? '(Key already saved — enter new key to replace)' : '(Required for cloud reasoning)'}
                </span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'ollama' ? 'Local Ollama uses zero API keys' : 'Paste API key (stored locally in .vectorforce/config.json)'}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingLlm}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSavingLlm ? 'Saving...' : 'Save & Activate Model'}</span>
            </button>
          </div>

          {llmFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                llmFeedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{llmFeedback.text}</span>
            </div>
          )}
        </form>
      </div>

      {/* Section 2: Interactive Document Allowlist Policy Manager */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              2. Document Policy Allowlist (Checkpoint Evidence Collection)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {allowedDocs.length} file(s) allowlisted
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Only allowlisted `.md` and `.txt` files (`&lt; 8 KiB` each) are collected and SHA-256 hashed during checkpoints. Add or remove files below without using the CLI:
        </p>

        <div className="flex flex-wrap gap-2">
          {allowedDocs.map((doc) => (
            <div
              key={doc}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-300"
            >
              <span>{doc}</span>
              <button
                type="button"
                onClick={() => handleRemoveDoc(doc)}
                className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                title="Remove from allowlist"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            value={newDocPath}
            onChange={(e) => setNewDocPath(e.target.value)}
            placeholder="e.g. ARCHITECTURE.md or docs/spec.md"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => handleAddDoc()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Allowlist</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>Quick Add:</span>
          {['AGENTS.md', 'ARCHITECTURE.md', 'README.md', 'SPEC.md'].map((presetDoc) => (
            <button
              key={presetDoc}
              type="button"
              onClick={() => handleAddDoc(presetDoc)}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-300 font-mono cursor-pointer"
            >
              + {presetDoc}
            </button>
          ))}
        </div>

        {policyFeedback && (
          <p className="text-xs text-emerald-400 font-medium">{policyFeedback}</p>
        )}
      </div>

      {/* Section 3: One-Click MCP Client Harness Sync */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">
              3. One-Click AI Client MCP Harness Auto-Installer
            </h2>
          </div>
          <button
            type="button"
            onClick={handleSyncHarnesses}
            disabled={isSyncingHarnesses}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingHarnesses ? 'animate-spin' : ''}`} />
            <span>{isSyncingHarnesses ? 'Syncing...' : 'Sync All AI Client MCP Configs'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Automatically writes and updates `.agents/mcp_config.json` (Google Antigravity), `.mcp.json` (Claude Code &amp; Command Code), `.muse/mcp_config.json` (Meta Muse), and `.codex/config.toml` (OpenAI Codex).
        </p>

        {harnessResult && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {harnessResult.map((item) => (
              <div
                key={item.harness}
                className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs space-y-1"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{item.harness}</span>
                </div>
                <p className="font-mono text-[11px] text-slate-400 truncate">{item.path}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Appearance & Theme */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">4. Appearance &amp; Theme</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Active: {theme === 'light' ? 'Light Theme' : 'Dark Theme'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button
            type="button"
            onClick={() => { if (theme !== 'dark') onToggleTheme(); }}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
              theme === 'dark'
                ? 'bg-indigo-600/15 border-indigo-500/60 ring-2 ring-indigo-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Dark Mode</span>
                {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Deep slate &amp; neon accents</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { if (theme !== 'light') onToggleTheme(); }}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
              theme === 'light'
                ? 'bg-indigo-50 border-indigo-500/60 ring-2 ring-indigo-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Light Mode</span>
                {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Crisp, high-contrast daylight</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
