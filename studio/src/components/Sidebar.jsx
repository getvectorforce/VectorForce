import React from 'react';
import {
  LayoutDashboard,
  Network,
  Sparkles,
  Database,
  History,
  Users,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, projectData }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'graph', label: 'Project Graph', icon: Network, badge: 'WOW' },
    { id: 'ai', label: 'AI Workspace', icon: Sparkles, highlight: true },
    { id: 'memory', label: 'Memory & Ontology', icon: Database },
    { id: 'timeline', label: 'Timeline & History', icon: History },
    { id: 'team', label: 'Team & Handoff', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0c121e]/90 flex flex-col justify-between shrink-0 h-screen select-none">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 glow-indigo">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white tracking-tight text-base">VectorForce</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Studio</span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">AI Engineering Memory</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Card */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Meta Muse Spark
            </span>
            <span className="text-emerald-400 font-semibold text-[11px]">Online</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Storage: SQLite WAL</span>
            <span className="text-slate-400 font-mono">0.1.0</span>
          </div>
          <div className="pt-1.5 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-indigo-300/90 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Local-First &amp; Zero Leaks</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
