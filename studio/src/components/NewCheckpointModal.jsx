import React, { useState, useEffect } from 'react';
import {
  Plus,
  ShieldCheck,
  X
} from 'lucide-react';

export default function NewCheckpointModal({ isOpen, onClose, onSaveCheckpoint, projectData }) {
  const defaultTask = projectData?.tasks?.[0]?.task_id || 'main';
  const [taskId, setTaskId] = useState(defaultTask);
  const [authorHarness, setAuthorHarness] = useState('studio');
  const [summary, setSummary] = useState('');
  const [goal, setGoal] = useState('');
  const [constraint, setConstraint] = useState('');
  const [decisionId, setDecisionId] = useState('DEC-STUDIO-01');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectData?.tasks?.[0]?.task_id) {
      setTaskId(projectData.tasks[0].task_id);
    }
  }, [projectData?.tasks]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summary.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveCheckpoint({
        taskId: taskId.trim(),
        authorHarness,
        summary: summary.trim(),
        goals: goal.trim() ? [goal.trim()] : [],
        constraints: constraint.trim() ? [constraint.trim()] : [],
        decisions: decisionTitle.trim()
          ? [{
              id: decisionId.trim() || 'DEC-STUDIO-01',
              title: decisionTitle.trim(),
              rationale: decisionRationale.trim() || 'Recorded via VectorForce Studio UI'
            }]
          : [],
        nextSteps: nextStep.trim() ? [nextStep.trim()] : [],
        requestedDocuments: Array.isArray(projectData?.allowedDocuments) ? projectData.allowedDocuments : []
      });
      setSummary('');
      setGoal('');
      setConstraint('');
      setDecisionTitle('');
      setDecisionRationale('');
      setNextStep('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0d1322] border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Capture Immutable Checkpoint (SQLite WAL)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Task ID:</label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Source Harness / IDE:</label>
              <select
                value={authorHarness}
                onChange={(e) => setAuthorHarness(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="studio">VectorForce Studio UI</option>
                <option value="antigravity">Google Antigravity</option>
                <option value="muse-code">Meta Muse (muse-code)</option>
                <option value="command-code">Claude Code / Command Code</option>
                <option value="codex">OpenAI Codex CLI</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Concise Summary of Work:</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Implemented promo discount validation and updated Studio model settings"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Active Goal:</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Zero rounding drift"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Invariant Constraint:</label>
              <input
                type="text"
                value={constraint}
                onChange={(e) => setConstraint(e.target.value)}
                placeholder="e.g. Zero external runtime DB"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Decision ID:</label>
              <input
                type="text"
                value={decisionId}
                onChange={(e) => setDecisionId(e.target.value)}
                placeholder="DEC-01"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Decision Title:</label>
              <input
                type="text"
                value={decisionTitle}
                onChange={(e) => setDecisionTitle(e.target.value)}
                placeholder="e.g. IntegerCentMath"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Rationale:</label>
              <input
                type="text"
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Why chosen..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Immediate Next Step:</label>
            <input
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="e.g. Run E2E verification in Command Code"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Persists directly to .vectorforce/vectorforce.db</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                {isSubmitting ? 'Committing...' : 'Commit Checkpoint'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
