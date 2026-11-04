import React, { useState } from 'react';
import {
  Network,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Layers,
  FileCode2,
  CheckCircle2,
  Zap,
  ArrowRight,
  Maximize2,
  Search,
  Filter,
  Eye,
  Info
} from 'lucide-react';

export default function ProjectGraphView({ projectData, onTriggerReasoning }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const modules = projectData?.modules || [];
  const activeNodeId = selectedNodeId || (modules[0]?.id ?? '');
  const selectedModule = modules.find((m) => m.id === activeNodeId) || modules[0];

  const uniqueCategories = ['all', ...Array.from(new Set(modules.map((m) => m.category).filter(Boolean)))];

  const filteredModules = modules.filter((m) => {
    const matchesCategory = categoryFilter === 'all' || (m.category && m.category.toLowerCase() === categoryFilter.toLowerCase());
    const matchesSearch = !searchQuery ||
      (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.id && m.id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate connection lines between nodes from live dependency graph or fallback
  const connections = Array.isArray(projectData?.connections) && projectData.connections.length > 0
    ? projectData.connections
    : [
        { from: 'mcp-bridge', to: 'context-store' },
        { from: 'mcp-bridge', to: 'auth-service' },
        { from: 'mcp-bridge', to: 'ai-reasoning' },
        { from: 'auth-service', to: 'context-store' },
        { from: 'ai-reasoning', to: 'code-index' },
        { from: 'ai-reasoning', to: 'context-store' },
        { from: 'ai-reasoning', to: 'briefing-engine' },
        { from: 'code-index', to: 'context-store' },
        { from: 'briefing-engine', to: 'context-store' },
        { from: 'handoff-service', to: 'context-store' }
      ];

  const canvasWidth = Math.max(1050, ...modules.map((m) => (m.x || 0) + 260));
  const canvasHeight = Math.max(700, ...modules.map((m) => (m.y || 0) + 180));

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col bg-[#070b13] relative overflow-hidden">
        {/* Top Floating Controls */}
        <div className="p-4 flex items-center justify-between z-10 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-400" />
              <h1 className="text-base font-bold text-white">Engineering Project Graph</h1>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
              Live Semantic Topology
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Find module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                    categoryFilter === cat
                      ? 'bg-indigo-600 text-white font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Canvas Graph */}
        <div className="flex-1 relative overflow-auto p-8 flex items-center justify-center">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          {/* SVG Connection Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {connections.map((conn, idx) => {
              const fromNode = modules.find((m) => m.id === conn.from);
              const toNode = modules.find((m) => m.id === conn.to);
              if (!fromNode || !toNode) return null;
              return (
                <g key={idx}>
                  <line
                    x1={fromNode.x + 110}
                    y1={fromNode.y + 40}
                    x2={toNode.x + 110}
                    y2={toNode.y + 40}
                    stroke="url(#edge-gradient)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="animate-pulse"
                  />
                  <circle
                    cx={(fromNode.x + toNode.x) / 2 + 110}
                    cy={(fromNode.y + toNode.y) / 2 + 40}
                    r="3"
                    fill="#a855f7"
                    className="animate-ping"
                  />
                </g>
              );
            })}
          </svg>

          {/* Render Nodes */}
          <div className="relative" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
            {filteredModules.map((mod) => {
              const isSelected = mod.id === activeNodeId;
              const hasDrift = mod.drift;
              return (
                <div
                  key={mod.id}
                  onClick={() => setSelectedNodeId(mod.id)}
                  style={{ left: `${mod.x}px`, top: `${mod.y}px` }}
                  className={`absolute w-56 p-4 rounded-xl cursor-pointer transition-all duration-300 select-none ${
                    isSelected
                      ? 'bg-slate-900 border-2 border-indigo-400 shadow-xl shadow-indigo-500/25 scale-105 z-20'
                      : 'bg-slate-900/85 hover:bg-slate-800/90 border border-slate-700/80 hover:border-slate-500 shadow-lg z-10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {mod.category}
                    </span>
                    {hasDrift ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <ShieldAlert className="w-3 h-3 text-amber-400 animate-pulse" />
                        Drift
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-white mt-2 leading-snug">{mod.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{mod.description}</p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{mod.files} files</span>
                    </span>
                    <span className="text-indigo-400 font-semibold hover:underline flex items-center gap-0.5">
                      Inspect <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Drawer: Module Inspector */}
      {selectedModule && (
        <aside className="w-96 border-l border-slate-800/80 bg-[#0c121e]/95 p-6 flex flex-col justify-between overflow-y-auto shrink-0 z-20">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {selectedModule.category}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  selectedModule.drift
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {selectedModule.status}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{selectedModule.name}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedModule.description}</p>
            </div>

            {/* Drift Alert Warning if active */}
            {selectedModule.drift && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Tamper / Drift Flagged</span>
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Document <code className="text-amber-100 font-mono">docs/spec.md</code> was modified on disk. VectorForce isolated the injected text as Untrusted Reference Data.
                </p>
              </div>
            )}

            {/* Owner & Identity */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Module Ownership</h3>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Owner:</span>
                <span className="text-slate-200 font-semibold">{selectedModule.owner}</span>
              </div>
            </div>

            {/* Architectural Decisions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Governing Decisions</h3>
              <div className="space-y-2">
                {selectedModule.decisions?.map((dec) => (
                  <div key={dec} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-xs font-mono font-bold text-indigo-400">{dec.split(':')[0]}</span>
                    <p className="text-xs text-slate-300 font-medium">{dec.split(':')[1] || dec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependencies */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topological Dependencies</h3>
              <div className="flex flex-wrap gap-2">
                {selectedModule.dependencies?.map((dep) => (
                  <span
                    key={dep}
                    onClick={() => setSelectedNodeId(dep)}
                    className="cursor-pointer text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700 transition-colors"
                  >
                    ➔ {dep}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-6 border-t border-slate-800">
            <button
              onClick={() => onTriggerReasoning(`Analyze module ${selectedModule.name} and suggest refactorings`)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              <span>Reason About {selectedModule.name}</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
