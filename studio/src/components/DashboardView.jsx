import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
  Database,
  Cpu,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Settings
} from 'lucide-react';

export default function DashboardView({
  projectData,
  onNavigateToTab,
  onTriggerReasoning,
  onOpenCheckpointModal,
  onRefreshData
}) {
  const [heroPrompt, setHeroPrompt] = useState('');
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTaskId, setNewTaskId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);

  const lastCp = projectData?.checkpoints?.[0];
  const isDrift = projectData?.health?.driftDetected;
  const activeTaskId = lastCp?.task_id || projectData?.tasks?.[0]?.task_id || 'main';

  useEffect(() => {
    fetch('/api/todos')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.todos)) setTodos(data.todos);
      })
      .catch(() => {});
  }, []);

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    if (!heroPrompt.trim()) return;
    onTriggerReasoning(heroPrompt);
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', text: newTodoText, taskId: activeTaskId })
    }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      setTodos(data.todos || []);
      setNewTodoText('');
    }
  };

  const handleToggleTodo = async (id) => {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id })
    }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      setTodos(data.todos || []);
    }
  };

  const handleDeleteTodo = async (id) => {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      setTodos(data.todos || []);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskId.trim()) return;
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: newTaskId.trim(), title: newTaskTitle.trim() || newTaskId.trim() })
    }).catch(() => null);
    if (res && res.ok) {
      setNewTaskId('');
      setNewTaskTitle('');
      setShowNewTaskForm(false);
      if (onRefreshData) onRefreshData();
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'active' : 'completed';
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', taskId: task.task_id, status: nextStatus })
    }).catch(() => null);
    if (res && res.ok && onRefreshData) {
      onRefreshData();
    }
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

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onTriggerReasoning(`Continue work on ${activeTaskId}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Session</span>
            </button>
            <button
              onClick={() => onNavigateToTab('settings')}
              className="px-4 py-3 rounded-xl glass-panel-subtle hover:bg-slate-800 text-slate-200 font-medium text-sm transition-all border border-slate-700/60 flex items-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Configure Model</span>
            </button>
            <button
              onClick={() => onNavigateToTab('graph')}
              className="px-4 py-3 rounded-xl glass-panel-subtle hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all border border-slate-700/60 cursor-pointer"
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
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
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

        {/* Card 2: AI Reasoning Provider (Clickable to open Settings) */}
        <div
          onClick={() => onNavigateToTab('settings')}
          className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Reasoning</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-base font-bold text-white truncate">
              {projectData?.ai?.model || 'Meta Muse Spark Open'}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-indigo-300 font-medium">
                {projectData?.ai?.provider || 'fireworks'} · Click to change
              </span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <div className="flex justify-between items-center">
              <span>Mode:</span>
              <span className="text-slate-200 font-mono">UI Configurable</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Context Budget:</span>
              <span className="text-slate-200 font-mono">128k–1M</span>
            </div>
          </div>
        </div>

        {/* Card 3: Ontology & Code Index */}
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
              <span className="text-slate-200 font-mono">{projectData?.stats?.filesIndexed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Decisions Recorded:</span>
              <span className="text-indigo-400 font-mono font-bold">{projectData?.stats?.decisionsCount}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Checkpoints & Tasks */}
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
              <span className="text-blue-400 font-mono font-medium">{projectData?.stats?.activeTasks ?? projectData?.tasks?.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Allowlisted Docs:</span>
              <span className="text-slate-300 font-mono">{projectData?.stats?.allowlistedDocs}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tasks & Engineering To-Do List Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interactive Engineering To-Do & Next Steps List */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Engineering To-Do &amp; Next Steps</h2>
            </div>
            <button
              type="button"
              onClick={onOpenCheckpointModal}
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-semibold cursor-pointer"
            >
              + Commit Checkpoint
            </button>
          </div>

          <form onSubmit={handleAddTodo} className="flex gap-2">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add an engineering action item or next step..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {todos.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No pending action items. Add a to-do above to track your next engineering step!
              </p>
            ) : (
              todos.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTodo(item.id)}
                    className="flex items-center gap-2.5 text-left flex-1 cursor-pointer"
                  >
                    {item.done ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={item.done ? 'line-through text-slate-500' : 'text-slate-200'}>
                      {item.text}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTodo(item.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Interactive Workspace Tasks Manager */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Workspace Tasks Manager</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowNewTaskForm((v) => !v)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          </div>

          {showNewTaskForm && (
            <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <input
                type="text"
                value={newTaskId}
                onChange={(e) => setNewTaskId(e.target.value)}
                placeholder="Task ID (e.g. feat-qr)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                required
              />
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                Create Task
              </button>
            </form>
          )}

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {(projectData?.tasks || []).map((t) => (
              <div
                key={t.task_id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-300">{t.task_id}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        t.status === 'completed'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-slate-300 truncate mt-0.5">{t.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onTriggerReasoning(`Analyze task ${t.task_id}: ${t.title}`)}
                    className="px-2 py-1 rounded bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 font-semibold cursor-pointer"
                  >
                    Reason ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleTaskStatus(t)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    {t.status === 'completed' ? 'Reopen' : 'Complete ✓'}
                  </button>
                </div>
              </div>
            ))}
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
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
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
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer"
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
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
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
              {(projectData?.constraints || []).slice(0, 4).map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
