import React from 'react';
import {
  Settings,
  Database,
  Cpu,
  ShieldCheck,
  HardDrive,
  FileText,
  Sliders,
  CheckCircle2,
  Sun,
  Moon,
  Palette
} from 'lucide-react';

export default function SettingsView({ projectData, theme, onToggleTheme }) {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">System Configuration &amp; Invariants</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          VectorForce runtime engine settings, visual themes, AI model endpoints, and document policy allowlists.
        </p>
      </div>

      {/* Section 0: Appearance & Theme */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Appearance &amp; Theme</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Active: {theme === 'light' ? 'Light Theme' : 'Dark Theme'}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Choose your interface theme. Both Light and Dark modes are crafted with modern high-contrast glassmorphism, responsive shadows, and smooth transitions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button
            onClick={() => { if (theme !== 'dark') onToggleTheme(); }}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left ${
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
            onClick={() => { if (theme !== 'light') onToggleTheme(); }}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left ${
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

      {/* Section 1: AI Provider */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">AI Reasoning Configuration (ADR-013)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Provider Type:</label>
            <input
              type="text"
              readOnly
              value="OpenAI-compatible / Meta Muse / Ollama"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Active Model:</label>
            <input
              type="text"
              readOnly
              value="llama-3.3-70b-versatile / llama3.1:8b"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Environment Variable:</span>
            <code className="text-indigo-300 font-mono">VF_LLM_PROVIDER=openai | ollama</code>
          </div>
          <div className="flex items-center justify-between">
            <span>Privacy Filter:</span>
            <span className="text-emerald-400 font-medium">Zero secrets in prompt</span>
          </div>
        </div>
      </div>

      {/* Section 2: Storage & Invariants */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-bold text-white">Local-First Storage Engine</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Database Path:</span>
            <p className="font-mono text-slate-200 text-xs truncate">.vectorforce/vectorforce.db</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Journal Mode:</span>
            <p className="font-mono text-emerald-400 text-xs">Write-Ahead Logging (WAL)</p>
          </div>
        </div>

        <div className="pt-2 text-xs text-slate-400 space-y-2">
          <h3 className="font-bold text-slate-300">Enforced Invariants:</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-400">
            <li>Strict zero external runtime dependencies (Node built-ins only).</li>
            <li>Receipts never contain document bodies or private credentials.</li>
            <li>Document capture restricted to allowlist (`vf policy list`).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
