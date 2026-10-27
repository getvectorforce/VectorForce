import React from 'react';
import {
  Sparkles,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  Plus,
  RefreshCw,
  Zap,
  Terminal,
  Sun,
  Moon
} from 'lucide-react';

export default function Header({
  projectData,
  theme,
  onToggleTheme,
  onOpenCheckpointModal,
  onTriggerReasoning,
  isScanningDrift,
  onScanDrift
}) {
  const isDrift = projectData?.health?.driftDetected;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
      {/* Left: Project identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-base tracking-tight">{projectData?.project?.name || 'VectorForce'}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {projectData?.project?.id?.slice(0, 12)}...
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
          <span>main</span>
          <span className="text-slate-600">@</span>
          <span className="text-slate-300">6593b6f</span>
        </div>
      </div>

      {/* Right: Status Pills & Action buttons */}
      <div className="flex items-center gap-3">
        {/* Drift Pill */}
        <button
          onClick={onScanDrift}
          disabled={isScanningDrift}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
            isDrift
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
          title="Click to re-verify workspace and document drift"
        >
          {isDrift ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{isDrift ? 'Drift Detected' : 'No Drift'}</span>
          <RefreshCw className={`w-3 h-3 text-slate-500 ${isScanningDrift ? 'animate-spin' : ''}`} />
        </button>

        {/* AI Model Badge */}
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Meta Llama 3.3 / Muse</span>
        </div>

        {/* Quick Reasoning Trigger */}
        <button
          onClick={() => onTriggerReasoning()}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
          <span>Ask VectorForce</span>
        </button>

        {/* New Checkpoint Button */}
        <button
          onClick={onOpenCheckpointModal}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-slate-400" />
          <span>Checkpoint</span>
        </button>

        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label="Toggle Light / Dark Mode"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500/20" />
              <span className="font-semibold text-slate-700">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <span className="font-semibold text-slate-200">Light</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
