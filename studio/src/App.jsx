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
  const [currentTab, setCurrentTab] = useState('dashboard');
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

  // Attempt to fetch real live data from VectorForce API server if running
  useEffect(() => {
    async function loadLiveData() {
      try {
        const [statusRes, memoryRes] = await Promise.all([
          fetch('/api/status').catch(() => null),
          fetch('/api/memory').catch(() => null)
        ]);

        if (statusRes && statusRes.ok) {
          const status = await statusRes.json();
          setProjectData((prev) => ({
            ...prev,
            project: { ...prev.project, name: status.project.name, id: status.project.id },
            ai: status.ai || prev.ai,
            tasks: status.tasks || prev.tasks,
            lastCheckpoint: status.lastCheckpoint || prev.lastCheckpoint,
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
    }
    loadLiveData();
  }, []);

  const handleTriggerReasoning = (prompt = '') => {
    setAiFocusPrompt(prompt);
    setCurrentTab('ai');
  };

  const handleScanDrift = () => {
    setIsScanningDrift(true);
    setTimeout(() => {
      setIsScanningDrift(false);
      // Toggle or verify drift state
    }, 600);
  };

  const handleSaveCheckpoint = (cpData) => {
    const newId = `cp-${Date.now().toString(16)}`;
    const newCheckpoint = {
      id: newId,
      task_id: cpData.taskId,
      timestamp: 'Just now',
      author: 'You (VectorForce Studio)',
      summary: cpData.summary,
      commit: '6593b6f',
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
            <TeamHandoffView projectData={projectData} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              projectData={projectData}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )}
        </main>
      </div>

      {/* Checkpoint Modal */}
      <NewCheckpointModal
        isOpen={isCheckpointModalOpen}
        onClose={() => setIsCheckpointModalOpen(false)}
        onSaveCheckpoint={handleSaveCheckpoint}
      />
    </div>
  );
}
