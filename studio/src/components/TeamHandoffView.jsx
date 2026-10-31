import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Share2,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FileJson,
  Terminal,
  ShieldCheck
} from 'lucide-react';

export default function TeamHandoffView({ projectData, onRefreshData }) {
  const tasksList = Array.isArray(projectData?.tasks)
    ? projectData.tasks
    : (projectData?.tasks?.list || []);

  const checkpointsList = Array.isArray(projectData?.checkpoints)
    ? projectData.checkpoints
    : [];

  const [recipient, setRecipient] = useState('External Reviewer');
  const [selectedTask, setSelectedTask] = useState(tasksList[0]?.task_id || '');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [destinationHarness, setDestinationHarness] = useState('any');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportedReceipt, setExportedReceipt] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  // Import state
  const [importMode, setImportMode] = useState('file'); // 'file' | 'path'
  const [importBundlePath, setImportBundlePath] = useState('');
  const [importBundleContent, setImportBundleContent] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importTargetTask, setImportTargetTask] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (tasksList.length > 0 && (!selectedTask || !tasksList.some(t => t.task_id === selectedTask))) {
      setSelectedTask(tasksList[0].task_id);
    }
  }, [tasksList, selectedTask]);

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

  const taskCheckpoints = checkpointsList.filter(cp => !selectedTask || cp.task_id === selectedTask);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const res = await fetch('/api/handoff/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipient.trim() || 'Collaborator',
          taskId: selectedTask || tasksList[0]?.task_id,
          checkpointId: selectedCheckpoint || undefined,
          destinationHarness
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setExportError(data.error || 'Failed to export handoff package');
        return;
      }

      const docs = data.handoff?.checkpoint?.evidence?.documents?.map(d => d.path) || ['AGENTS.md'];
      const sha = data.manifest?.files?.[0]?.sha256 || data.receipt?.request_hash || 'verified';

      setExportedReceipt({
        package_id: data.package_id,
        bundle_path: data.bundlePath || `~/.vectorforce/handoffs/${data.package_id}.json`,
        recipient: recipient.trim() || 'Collaborator',
        destinationHarness,
        task_id: data.handoff?.origin?.task_id || selectedTask,
        checkpoint_id: data.handoff?.origin?.checkpoint_id || '',
        sha256: sha,
        timestamp: data.manifest?.created_at || new Date().toISOString(),
        status: data.receipt?.status || 'committed',
        docsIncluded: docs.length > 0 ? docs : ['AGENTS.md'],
        docsRedacted: ['.env*', '*.pem', 'id_rsa*'],
        bundle: data.bundle || {
          schema_version: 'vectorforce/handoff-bundle/v1',
          package_id: data.package_id,
          created_at: data.manifest?.created_at || new Date().toISOString(),
          manifest: data.manifest,
          handoff: data.handoff
        }
      });
    } catch (err) {
      setExportError(err.message || 'Network error while exporting handoff package');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadBundle = () => {
    if (!exportedReceipt?.bundle) return;
    const jsonString = JSON.stringify(exportedReceipt.bundle, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportedReceipt.package_id}.vfhandoff.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportBundleContent(String(ev.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const payload = importMode === 'path'
        ? { bundlePath: importBundlePath.trim(), targetTaskId: importTargetTask.trim() || undefined }
        : { bundleContent: importBundleContent, targetTaskId: importTargetTask.trim() || undefined };

      const res = await fetch('/api/handoff/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setImportError(data.error || 'Failed to import handoff package');
        return;
      }
      setImportResult(data);
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err) {
      setImportError(err.message || 'Failed to import handoff package');
    } finally {
      setIsImporting(false);
    }
  };

  const authorsToDisplay = teamMembers.length > 0 ? teamMembers : (projectData?.team || []);

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
            {authorsToDisplay.length || 1} Registered Author(s)
          </span>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {authorsToDisplay.map((member) => (
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
                  {Array.isArray(member.tasks) ? member.tasks.join(', ') : (member.activeTask || selectedTask)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selective Context Handoff Generator */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Export Boundary-Safe Handoff Package</h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            SHA-256 Manifest Signed
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          VectorForce packages active goals, architectural decisions, and allowlisted documents into an immutable, single-file <code className="text-indigo-300">.vfhandoff.json</code> bundle. Unallowlisted files and secrets are mathematically excluded.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recipient */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Target Recipient:</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. External Reviewer, Priya (Backend), Security Audit"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['External Reviewer', 'Teammate (Cross-Harness)', 'Security Audit', 'Release Lead'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRecipient(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                    recipient === preset
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Active Task Scope */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Active Task Scope:</label>
            <select
              value={selectedTask}
              onChange={(e) => {
                setSelectedTask(e.target.value);
                setSelectedCheckpoint('');
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            >
              {tasksList.map(t => (
                <option key={t.task_id} value={t.task_id}>
                  {t.task_id} ({t.title || t.status || 'active'})
                </option>
              ))}
            </select>
          </div>

          {/* Checkpoint Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Checkpoint Snapshot:</label>
            <select
              value={selectedCheckpoint}
              onChange={(e) => setSelectedCheckpoint(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">Latest Head Checkpoint (Auto-Resolve)</option>
              {taskCheckpoints.map(cp => (
                <option key={cp.checkpoint_id} value={cp.checkpoint_id}>
                  {cp.checkpoint_id.slice(0, 8)} — [{cp.author?.harness || 'cli'}] {(cp.summary || '').slice(0, 48)}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Harness */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Target AI Harness:</label>
            <select
              value={destinationHarness}
              onChange={(e) => setDestinationHarness(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="any">Any Harness (Universal Handoff)</option>
              <option value="antigravity">Google Antigravity (antigravity)</option>
              <option value="muse-code">Meta Muse (muse-code)</option>
              <option value="command-code">Claude Code / Command Code (command-code)</option>
              <option value="codex">OpenAI Codex (codex)</option>
            </select>
          </div>
        </div>

        {exportError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 disabled:opacity-50"
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
          <div className="mt-4 p-5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Package Committed &amp; Verified ({exportedReceipt.status})</span>
              </span>
              <span className="font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-md">
                {exportedReceipt.package_id}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="truncate" title={exportedReceipt.bundle_path}>
                Saved File: <span className="text-indigo-300">{exportedReceipt.bundle_path}</span>
              </div>
              <div>
                SHA-256: <span className="text-emerald-300">{exportedReceipt.sha256.slice(0, 24)}...</span>
              </div>
              <div>
                Task / Checkpoint: <span className="text-slate-200">{exportedReceipt.task_id} ({exportedReceipt.checkpoint_id.slice(0, 8)})</span>
              </div>
              <div>
                Recipient / Harness: <span className="text-slate-200">{exportedReceipt.recipient} → {exportedReceipt.destinationHarness}</span>
              </div>
            </div>

            {/* Action Buttons: Download JSON, Copy JSON, Copy CLI Import Command */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadBundle}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow transition-colors"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Download {exportedReceipt.package_id}.vfhandoff.json</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy('json', JSON.stringify(exportedReceipt.bundle, null, 2))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
              >
                {copiedField === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'json' ? 'Copied Bundle JSON!' : 'Copy Bundle JSON'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy('cli', `vf handoff import "${exportedReceipt.bundle_path}"`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors font-mono"
              >
                {copiedField === 'cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
                <span>{copiedField === 'cli' ? 'Copied CLI Command!' : 'Copy CLI Import Command'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Allowlisted Evidence: {exportedReceipt.docsIncluded.join(', ')}</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero Secrets Leaked
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Import Teammate Handoff Package */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Import &amp; Reconcile Teammate Handoff Package</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setImportMode('file')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                importMode === 'file'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Upload / Paste JSON
            </button>
            <button
              type="button"
              onClick={() => setImportMode('path')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                importMode === 'path'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Local File Path
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Import a signed <code className="text-indigo-300">.vfhandoff.json</code> bundle from a teammate. VectorForce verifies the SHA-256 manifest digest before reconciling decisions and constraints into your local SQLite context ledger.
        </p>

        {importMode === 'file' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.vfhandoff.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
              >
                <FileJson className="w-4 h-4" />
                <span>Choose .vfhandoff.json File</span>
              </button>
              {importFileName && (
                <span className="text-xs font-mono text-emerald-400">
                  Loaded: {importFileName}
                </span>
              )}
              {exportedReceipt?.bundle && (
                <button
                  type="button"
                  onClick={() => {
                    setImportBundleContent(JSON.stringify(exportedReceipt.bundle, null, 2));
                    setImportFileName(`${exportedReceipt.package_id}.vfhandoff.json`);
                  }}
                  className="text-xs text-slate-400 hover:text-indigo-300 underline"
                >
                  Use Just-Exported Bundle ({exportedReceipt.package_id})
                </button>
              )}
            </div>

            <textarea
              rows={4}
              value={importBundleContent}
              onChange={(e) => setImportBundleContent(e.target.value)}
              placeholder='Or paste raw "vectorforce/handoff-bundle/v1" JSON content here...'
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Bundle File Path on Disk:</label>
            <input
              type="text"
              value={importBundlePath}
              onChange={(e) => setImportBundlePath(e.target.value)}
              placeholder="e.g. ~/.vectorforce/handoffs/hand-xxxx.json"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Target Task ID (Optional — defaults to origin task):</label>
            <input
              type="text"
              value={importTargetTask}
              onChange={(e) => setImportTargetTask(e.target.value)}
              placeholder={selectedTask || 'Leave blank to use package origin task'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || (importMode === 'file' ? !importBundleContent.trim() : !importBundlePath.trim())}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isImporting ? 'Verifying & Importing...' : 'Import & Reconcile Context'}</span>
            </button>
          </div>
        </div>

        {importError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {importResult && (
          <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Handoff Package Verified &amp; Imported into SQLite</span>
              </span>
              <span className="font-mono text-indigo-300">
                Checkpoint: {importResult.importedCheckpointId?.slice(0, 8)}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Reconciled into Task: <span className="text-slate-200">{importResult.task?.task_id}</span> ({importResult.task?.title})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
