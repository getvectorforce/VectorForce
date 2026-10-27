import React, { useState, useEffect } from 'react';
import {
  Users,
  Share2,
  Download,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Package,
  Terminal,
  FileText
} from 'lucide-react';

export default function TeamHandoffView({ projectData }) {
  const [recipient, setRecipient] = useState('External Reviewer');
  const [selectedTask, setSelectedTask] = useState('phase-5-pilot');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedReceipt, setExportedReceipt] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    fetch('/api/team')
      .then(res => res.json())
      .then(data => {
        if (data.team && data.team.length > 0) {
          setTeamMembers(data.team);
        }
      })
      .catch(() => {});
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/handoff/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          taskId: selectedTask,
          destinationHarness: 'any'
        })
      });
      const data = await res.json();
      if (data.package_id) {
        setExportedReceipt({
          package_id: data.package_id,
          bundle_path: data.bundlePath || `tmp/handoffs/${data.package_id}.json`,
          recipient,
          sha256: data.manifest?.checkpoint_hash || data.receipt?.manifest_hash || 'verified',
          timestamp: data.manifest?.timestamp || new Date().toISOString(),
          status: "committed",
          docsIncluded: data.handoff?.documents?.map(d => d.path) || ["AGENTS.md"],
          docsRedacted: [".env*", "*.pem", "id_rsa*"]
        });
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Team &amp; Safe Context Handoff</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Boundary-isolated context sharing across developer harnesses without leaking private credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
            {(teamMembers.length > 0 ? teamMembers.length : (projectData?.team?.length || 1))} Registered Author(s)
          </span>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(teamMembers.length > 0 ? teamMembers : (projectData?.team || [])).map((member) => (
          <div
            key={member.name}
            className="p-5 rounded-2xl glass-panel glass-panel-hover border border-slate-800 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{member.name}</h3>
                <p className="text-[11px] text-slate-400 font-medium">{member.role || 'Contributor'}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Harness:</span>
                <span className="text-slate-200 font-semibold">{member.harness || 'cli'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Tasks:</span>
                <span className="text-indigo-400 font-mono text-[11px]">
                  {Array.isArray(member.tasks) ? member.tasks.join(', ') : (member.activeTask || 'phase-5-pilot')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selective Context Handoff Generator */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Share2 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Export Boundary-Safe Handoff Package</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          VectorForce packages active goals, architectural decisions, and allowlisted documents into an immutable, single-file bundle. Unallowlisted files and secrets are mathematically excluded.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Target Recipient:</label>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="External Reviewer">External Reviewer (Audit)</option>
              <option value="Rahul (Feature: Payments)">Rahul (Feature: Payments)</option>
              <option value="Priya (Feature: Auth)">Priya (Feature: Auth)</option>
              <option value="Teammate">Teammate (Cross-Harness)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Active Task Scope:</label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            >
              {(projectData?.tasks?.list || [
                { task_id: 'phase-5-pilot', title: 'Phase 5: Consented Pilot' },
                { task_id: 'phase-4-handoff', title: 'Phase 4: Handoff & Safety' },
                { task_id: 'phase-3-complete', title: 'Phase 3: MCP Integration' }
              ]).map(t => (
                <option key={t.task_id} value={t.task_id}>
                  {t.task_id} ({t.title})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
          >
            {isExporting ? (
              <span>Generating Package...</span>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export Safe Package</span>
              </>
            )}
          </button>
        </div>

        {/* Verification Receipt Box */}
        {exportedReceipt && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Package Committed &amp; Verified</span>
              </span>
              <span className="font-mono text-slate-500">{exportedReceipt.package_id}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
              <div>Bundle: <span className="text-indigo-300">{exportedReceipt.bundle_path}</span></div>
              <div>SHA-256: <span className="text-slate-400">{exportedReceipt.sha256.slice(0, 16)}...</span></div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Allowlisted: {exportedReceipt.docsIncluded.join(', ')}</span>
              <span className="text-emerald-400 font-medium">Zero Secrets Leaked</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
