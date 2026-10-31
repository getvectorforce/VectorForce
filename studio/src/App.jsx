import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import ProjectGraphView from './components/ProjectGraphView';
import AiWorkspaceView from './components/AiWorkspaceView';
import MemoryView from './components/MemoryView';
import TimelineView from './components/TimelineView';
import TeamHandoffView from './components/TeamHandoffView';
import SettingsView from './components/SettingsView';
import NewCheckpointModal from './components/NewCheckpointModal';
import { initialProjectData } from './data/mockData';

export default function App() {
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('tab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [projectData, setProjectData] = useState(initialProjectData);
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
  const [aiFocusPrompt, setAiFocusPrompt] = useState('');
  const [isScanningDrift, setIsScanningDrift] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vf_theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('vf_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Fetch real live data from VectorForce API server
  const loadLiveData = async () => {
    try {
      const [statusRes, memoryRes, timelineRes] = await Promise.all([
        fetch('/api/status').catch(() => null),
        fetch('/api/memory').catch(() => null),
        fetch('/api/timeline?days=30').catch(() => null)
      ]);

      const status = statusRes && statusRes.ok ? await statusRes.json() : null;
      const memory = memoryRes && memoryRes.ok ? await memoryRes.json() : null;
      const timeline = timelineRes && timelineRes.ok ? await timelineRes.json() : null;

      if (status) {
        const liveCheckpoints = Array.isArray(timeline?.checkpoints)
          ? [...timeline.checkpoints].reverse().map((cp) => ({
              id: cp.checkpoint_id,
              checkpoint_id: cp.checkpoint_id,
              task_id: cp.task_id,
              timestamp: cp.timestamp ? new Date(cp.timestamp).toLocaleString() : 'Recent',
              author: `${cp.author?.name || 'developer'} (${cp.author?.harness || 'cli'})`,
              authorObj: cp.author || { name: 'developer', harness: 'cli' },
              summary: cp.summary || cp.claims?.summary || '',
              commit: cp.evidence?.git?.commit_hash ? cp.evidence.git.commit_hash.slice(0, 7) : 'local',
              branch: cp.evidence?.git?.branch || 'main',
              status: 'committed',
              goals: cp.claims?.goals || [],
              decisions: (cp.claims?.decisions || []).map((d) => d.id),
              drift: false
            }))
          : null;

        setProjectData((prev) => ({
          ...prev,
          project: {
            ...prev.project,
            name: status.project.name,
            id: status.project.id,
            canonical_path: status.project.path || prev.project.canonical_path
          },
          ai: {
            ...prev.ai,
            ...(status.ai || {})
          },
          tasks: Array.isArray(status.tasks?.list) ? status.tasks.list : prev.tasks,
          allowedDocuments: Array.isArray(memory?.allowedDocuments) ? memory.allowedDocuments : prev.allowedDocuments,
          lastCheckpoint: status.lastCheckpoint || prev.lastCheckpoint,
          checkpoints: liveCheckpoints && liveCheckpoints.length > 0 ? liveCheckpoints : prev.checkpoints,
          decisions: Array.isArray(memory?.decisions) && memory.decisions.length > 0 ? memory.decisions : prev.decisions,
          constraints: Array.isArray(memory?.constraints) && memory.constraints.length > 0 ? memory.constraints : prev.constraints,
          stats: {
            filesIndexed: memory?.filesIndexed ?? prev.stats.filesIndexed,
            symbolsIndexed: memory?.symbolsIndexed ?? prev.stats.symbolsIndexed,
            allowlistedDocs: Array.isArray(memory?.allowedDocuments) ? memory.allowedDocuments.length : prev.stats.allowlistedDocs,
            checkpointsCount: status.checkpointsCount ?? prev.stats.checkpointsCount,
            decisionsCount: Array.isArray(memory?.decisions) ? memory.decisions.length : prev.stats.decisionsCount,
            activeTasks: status.tasks?.active ?? prev.stats.activeTasks
          },
          health: {
            ...prev.health,
            score: status.health.score,
            driftDetected: status.health.driftDetected
          }
        }));
      }
    } catch {
      // Fallback to rich embedded data
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

  const handleTriggerReasoning = (prompt = '') => {
    setAiFocusPrompt(prompt);
    setCurrentTab('ai');
  };

  const handleScanDrift = () => {
    setIsScanningDrift(true);
    loadLiveData().finally(() => {
      setTimeout(() => setIsScanningDrift(false), 500);
    });
  };

  const handleSaveCheckpoint = async (cpData) => {
    try {
      const res = await fetch('/api/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpData)
      });
      if (res.ok) {
        await loadLiveData();
        return;
      }
    } catch {}
    // Fallback local state update
    const newId = `cp-${Date.now().toString(16)}`;
    const newCheckpoint = {
      id: newId,
      task_id: cpData.taskId,
      timestamp: 'Just now',
      author: 'You (VectorForce Studio)',
      summary: cpData.summary,
      commit: 'local',
      branch: 'main',
      status: 'committed',
      goals: cpData.goals,
      decisions: cpData.decisions?.map((d) => d.id) || [],
      drift: false
    };

    setProjectData((prev) => ({
      ...prev,
      checkpoints: [newCheckpoint, ...(prev.checkpoints || [])],
      stats: {
        ...prev.stats,
        checkpointsCount: (prev.stats?.checkpointsCount || 0) + 1
      }
    }));
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${
      theme === 'light' ? 'light bg-slate-50 text-slate-800' : 'dark bg-[#090d16] text-slate-100'
    }`}>
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        projectData={projectData}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          projectData={projectData}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenCheckpointModal={() => setIsCheckpointModalOpen(true)}
          onTriggerReasoning={handleTriggerReasoning}
          isScanningDrift={isScanningDrift}
          onScanDrift={handleScanDrift}
        />

        {/* View Routing */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              projectData={projectData}
              onNavigateToTab={setCurrentTab}
              onTriggerReasoning={handleTriggerReasoning}
              onOpenCheckpointModal={() => setIsCheckpointModalOpen(true)}
              onRefreshData={loadLiveData}
            />
          )}

          {currentTab === 'graph' && (
            <ProjectGraphView
              projectData={projectData}
              onTriggerReasoning={handleTriggerReasoning}
            />
          )}

          {currentTab === 'ai' && (
            <AiWorkspaceView
              projectData={projectData}
              initialPrompt={aiFocusPrompt}
            />
          )}

          {currentTab === 'memory' && (
            <MemoryView projectData={projectData} />
          )}

          {currentTab === 'timeline' && (
            <TimelineView
              projectData={projectData}
              onTriggerReasoning={handleTriggerReasoning}
            />
          )}

          {currentTab === 'team' && (
            <TeamHandoffView
              projectData={projectData}
              onRefreshData={loadLiveData}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              projectData={projectData}
              theme={theme}
              onToggleTheme={toggleTheme}
              onRefreshData={loadLiveData}
            />
          )}
        </main>
      </div>

      {/* Checkpoint Modal */}
      <NewCheckpointModal
        isOpen={isCheckpointModalOpen}
        onClose={() => setIsCheckpointModalOpen(false)}
        onSaveCheckpoint={handleSaveCheckpoint}
        projectData={projectData}
      />
    </div>
  );
}
