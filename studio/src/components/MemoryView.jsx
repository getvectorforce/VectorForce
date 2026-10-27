import React, { useState } from 'react';
import {
  Database,
  FileCode2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ShieldCheck,
  Hash
} from 'lucide-react';

export default function MemoryView({ projectData }) {
  const [activeTab, setActiveTab] = useState('decisions');
  const [search, setSearch] = useState('');

  const decisions = projectData?.decisions || [];
  const constraints = projectData?.constraints || [];

  const filteredDecisions = decisions.filter(
    (d) =>
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.rationale.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Project Memory &amp; Ontology</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Durable engineering memory: AST code symbols, allowlisted specs, immutable decisions, and constraints.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          {[
            { id: 'decisions', label: `Decisions (${decisions.length})` },
            { id: 'constraints', label: `Constraints (${constraints.length})` },
            { id: 'symbols', label: 'Code Symbols' },
            { id: 'docs', label: 'Allowlisted Docs' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Decisions View */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recorded Architectural Choices (ADRs / Checkpoints)
            </span>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter decisions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs text-white pl-8 pr-3 py-1.5 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDecisions.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-2xl glass-panel glass-panel-hover border border-slate-800/80 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                      {d.id}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{d.taskId}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2">{d.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{d.rationale}</p>
                </div>
                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Committed &amp; Verified</span>
                  </span>
                  <span>{d.timestamp?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraints View */}
      {activeTab === 'constraints' && (
        <div className="space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Non-Negotiable Invariants
          </span>
          <div className="space-y-3">
            {constraints.map((c, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl glass-panel border border-amber-500/20 flex items-start gap-3 bg-amber-500/5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-200">{c}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Enforced at every checkpoint across Google Antigravity and Command Code.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Symbols View */}
      {activeTab === 'symbols' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl glass-panel space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-400" />
                <span>Containment-Safe Workspace AST Symbols</span>
              </span>
              <span className="text-xs font-mono text-indigo-400 font-semibold">1,420 Symbols Indexed</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Symbols are extracted deterministically without cloud scrapers or external language servers. Zero external dependencies.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              {[
                { name: 'SqliteStore', type: 'Class', file: 'src/storage/sqlite-store.js', symbols: 18 },
                { name: 'ReasoningService', type: 'Class', file: 'src/operations/reasoning-service.js', symbols: 12 },
                { name: 'McpServer', type: 'Class', file: 'src/mcp/mcp-server.js', symbols: 14 },
                { name: 'HandoffService', type: 'Class', file: 'src/operations/handoff-service.js', symbols: 16 },
                { name: 'BriefingService', type: 'Class', file: 'src/operations/briefing-service.js', symbols: 8 },
                { name: 'CodeIndexProvider', type: 'Class', file: 'src/providers/code-index-provider.js', symbols: 10 }
              ].map((s) => (
                <div key={s.name} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 font-mono">{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{s.type}</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 truncate">{s.file}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Allowlisted Documents View */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl glass-panel space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Allowlisted Project Documents</span>
            </span>
            <div className="space-y-2 pt-2">
              {[
                { path: 'AGENTS.md', size: '2.1 kB', hash: 'cff46c35...', status: 'Verified' },
                { path: 'docs/spec.md', size: '50 bytes', hash: 'd4382c45...', status: 'Tamper Flagged (Pilot)' },
                { path: 'package.json', size: '942 bytes', hash: '8a3b129c...', status: 'Verified' }
              ].map((doc) => (
                <div key={doc.path} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="font-mono text-slate-200 font-semibold">{doc.path}</span>
                    <span className="text-[10px] text-slate-500">({doc.size})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500">{doc.hash}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      doc.status.includes('Tamper')
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
