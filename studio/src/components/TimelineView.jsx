import React, { useState } from 'react';
import {
  History,
  GitCommit,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Network
} from 'lucide-react';

export default function TimelineView({ projectData, onTriggerReasoning, onNavigateToTab }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showRecapModal, setShowRecapModal] = useState(false);

  const checkpoints = projectData?.checkpoints || [];

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Timeline &amp; Checkpoint Provenance</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable parent-linked checkpoint chain. Compare, resume, and audit engineering state over time.
          </p>
        </div>

        <button
          onClick={() => setShowRecapModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-105"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Weekly Engineering Recap</span>
        </button>
      </div>

      {/* Timeline River */}
      {checkpoints.length === 0 ? (
        <div className="p-12 rounded-2xl glass-panel border border-slate-800 text-center space-y-3">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No Checkpoints in Provenance Timeline</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            This workspace has not committed any VectorForce checkpoints yet. When you save checkpoints via your AI coding agent or the CLI, each step is parent-linked into this cryptographic chain.
          </p>
          <div className="inline-block bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-indigo-300">
            vf checkpoint --task &lt;task-id&gt; --summary &quot;Initial architecture checkpoint&quot;
          </div>
        </div>
      ) : (
        <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-slate-800">
          {checkpoints.map((cp, idx) => {
            const isExpanded = expandedId === cp.id;
            return (
              <div key={cp.id} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[30px] top-4 w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500 group-hover:border-purple-400 group-hover:scale-125 transition-all glow-indigo flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                </div>

                {/* Card Container */}
                <div className="p-5 rounded-2xl glass-panel glass-panel-hover border border-slate-800 space-y-3">
                  <div
                    onClick={() => toggleExpand(cp.id)}
                    className="flex flex-col md:flex-row md:items-start justify-between gap-3 cursor-pointer select-none"
                    title="Click to toggle checkpoint details"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-indigo-400">{cp.id.slice(0, 8)}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {cp.task_id}
                        </span>
                        {cp.drift ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            Drift Flagged
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Verified
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white pt-1">{cp.summary}</h3>
                    </div>

                    <span className="text-xs text-slate-500 shrink-0 font-medium">{cp.timestamp}</span>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono text-slate-300">{cp.commit}</span>
                      </span>
                      <span>By {cp.author}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('graph')}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 hover:text-white font-semibold text-xs border border-purple-500/30 transition-all flex items-center gap-1 cursor-pointer"
                          title="Inspect project topology graph"
                        >
                          <Network className="w-3 h-3" />
                          <span>Inspect Topology</span>
                        </button>
                      )}
                      <button
                        onClick={() => onTriggerReasoning(`Resume task ${cp.task_id} from checkpoint ${cp.id.slice(0, 8)}`)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold text-xs border border-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Resume Briefing</span>
                      </button>
                      <button
                        onClick={() => toggleExpand(cp.id)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 bg-slate-900/50 p-4 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Active Goals:</span>
                        <ul className="mt-1 space-y-1 text-slate-300">
                          {cp.goals?.map((g, i) => (
                            <li key={i}>• {g}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Decisions:</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {cp.decisions?.map((d) => (
                            <span
                              key={d}
                              onClick={() => onNavigateToTab && onNavigateToTab('memory')}
                              className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[11px] cursor-pointer hover:bg-indigo-500/25"
                              title="Click to view decision in Memory"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      {cp.driftWarning && (
                        <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px]">
                          ⚠️ {cp.driftWarning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Recap Modal */}
      {showRecapModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Weekly Engineering Recap (vf recap)</h2>
              </div>
              <button
                onClick={() => setShowRecapModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-mono bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
              <p className="text-indigo-300 font-bold"># Weekly Context Continuity Recap: VectorForce</p>
              <p>**Window:** Past 7 days | **Total Checkpoints:** 14 across 3 tasks</p>
              <div className="space-y-1 border-t border-slate-800 pt-2">
                <p className="font-bold text-slate-200">## Milestone Progression</p>
                <p>• Phase 3 (M2): Stdio MCP bridge for Google Antigravity &amp; Command Code</p>
                <p>• Phase 4 (M3): Selective export, safe import, cryptographic manifests</p>
                <p>• Phase 5 (M4): 62 automated tests passing, distribution packaging</p>
                <p>• Pilot Verification: Command Code drift &amp; prompt injection defense</p>
              </div>
              <div className="space-y-1 border-t border-slate-800 pt-2">
                <p className="font-bold text-slate-200">## Active Decisions</p>
                <p>• DEC-AI-1: OpenAI-compatible provider abstraction</p>
                <p>• DEC-AI-2: Ephemeral AI reasoning view</p>
                <p>• DEC-AUTH-01: SHA-256 Code Challenge (PKCE)</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRecapModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
