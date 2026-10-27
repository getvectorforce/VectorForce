import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Layers,
  Database,
  Cpu,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCode2,
  FileText
} from 'lucide-react';

export default function DashboardView({
  projectData,
  onNavigateToTab,
  onTriggerReasoning,
  onOpenCheckpointModal
}) {
  const [heroPrompt, setHeroPrompt] = useState('');
  const lastCp = projectData?.checkpoints?.[0];
  const isDrift = projectData?.health?.driftDetected;

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    if (!heroPrompt.trim()) return;
    onTriggerReasoning(heroPrompt);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero Continuation Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 border border-indigo-500/20 shadow-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Engineering Memory Online</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Resume Your Engineering Context
            </h1>
            <p className="text-sm text-slate-300/90 leading-relaxed">
              Last session recorded in task <span className="font-semibold text-indigo-300">{lastCp?.task_id}</span> by <span className="text-slate-200">{lastCp?.author}</span>. Zero cloud leaks, verified local SQLite state.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onTriggerReasoning("Continue OAuth & AI Reasoning implementation")}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Session</span>
            </button>
            <button
              onClick={() => onNavigateToTab('graph')}
              className="px-4 py-3 rounded-xl glass-panel-subtle hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all border border-slate-700/60"
            >
              Inspect Topology
            </button>
          </div>
        </div>

        {/* Quick Prompt Bar */}
        <form onSubmit={handleHeroSubmit} className="mt-6 relative z-10">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus-within:border-indigo-500/80 transition-all shadow-inner">
            <Sparkles className="w-4 h-4 text-indigo-400 ml-3 shrink-0" />
            <input
              type="text"
              value={heroPrompt}
              onChange={(e) => setHeroPrompt(e.target.value)}
              placeholder='Ask VectorForce: "What changed this week?", "Analyze architectural risk", "Continue task..."'
              className="w-full bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none px-2"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shrink-0"
            >
              <span>Ask AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Grid of 4 Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Project Health */}
        <div className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Health Score</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{projectData?.health?.score}%</span>
            <span className="text-xs font-semibold text-emerald-400">Optimal</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <div className="flex justify-between items-center">
              <span>Memory Chain:</span>
              <span className="text-emerald-400 font-medium">Verified</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Drift Status:</span>
              <span className={isDrift ? "text-amber-400 font-medium" : "text-emerald-400 font-medium"}>
                {isDrift ? "Tamper Flagged" : "Zero Drift"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: AI Model Connection */}
        <div className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Reasoning</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-base font-bold text-white truncate">Meta Llama 3.3 70B</div>
            <div className="text-xs text-indigo-300 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Muse Spark Connected</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <div className="flex justify-between items-center">
              <span>Latency:</span>
              <span className="text-slate-300 font-mono">184ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Context Budget:</span>
              <span className="text-slate-300 font-mono">128k</span>
            </div>
          </div>
        </div>

        {/* Card 3: Memory Footprint */}
        <div className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ontology &amp; Memory</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Database className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{projectData?.stats?.symbolsIndexed}</span>
            <span className="text-xs font-medium text-slate-400">Symbols</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <div className="flex justify-between items-center">
              <span>Files Indexed:</span>
              <span className="text-slate-300 font-mono">{projectData?.stats?.filesIndexed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Decisions Recorded:</span>
              <span className="text-indigo-400 font-mono font-medium">{projectData?.decisions?.length}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Active Checkpoints */}
        <div className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Provenance Chain</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{projectData?.checkpoints?.length}</span>
            <span className="text-xs font-medium text-slate-400">Checkpoints</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <div className="flex justify-between items-center">
              <span>Active Tasks:</span>
              <span className="text-blue-400 font-mono font-medium">{projectData?.tasks?.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Allowlisted Docs:</span>
              <span className="text-slate-300 font-mono">{projectData?.stats?.allowlistedDocs}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Checkpoints & Architectural Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Checkpoint Provenance */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Recent Provenance Checkpoints</h2>
            </div>
            <button
              onClick={() => onNavigateToTab('timeline')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>View All ({projectData?.checkpoints?.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {projectData?.checkpoints?.slice(0, 3).map((cp) => (
              <div
                key={cp.id}
                className="p-4 rounded-xl glass-panel glass-panel-hover border border-slate-800/80 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">{cp.id.slice(0, 8)}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {cp.task_id}
                      </span>
                      {cp.drift && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Drift
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                      {cp.summary}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0 font-medium">{cp.timestamp}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px]">
                      <GitCommit className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300">{cp.commit}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      By {cp.author}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cp.decisions?.map((d) => (
                      <span key={d} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {d}
                      </span>
                    ))}
                    <button
                      onClick={() => onTriggerReasoning(`Review checkpoint ${cp.id.slice(0, 8)}`)}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-indigo-500/10 transition-colors"
                    >
                      Reason ▶
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Key Architectural Decisions & Non-Negotiables */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Active Architectural Decisions</h2>
            </div>
            <button
              onClick={() => onNavigateToTab('memory')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              All ({projectData?.decisions?.length})
            </button>
          </div>

          <div className="space-y-3">
            {projectData?.decisions?.slice(0, 3).map((d) => (
              <div key={d.id} className="p-3.5 rounded-xl glass-panel-subtle border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-300">{d.id}</span>
                  <span className="text-[10px] font-mono text-slate-500">{d.taskId}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-200">{d.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{d.rationale}</p>
              </div>
            ))}
          </div>

          {/* Invariant Constraints Box */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Non-Negotiable Invariants</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>AI output is treated as model claim, never ground-truth evidence.</li>
              <li>Strict zero external runtime dependencies (Node built-ins only).</li>
              <li>Document allowlist enforcement before content is captured.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
