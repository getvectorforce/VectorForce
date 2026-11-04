import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SqliteStore } from '../storage/sqlite-store.js';
import { ProjectService } from '../operations/project-service.js';
import { CheckpointService } from '../operations/checkpoint-service.js';
import { BriefingService } from '../operations/briefing-service.js';
import { HandoffService } from '../operations/handoff-service.js';
import { ReasoningService } from '../operations/reasoning-service.js';
import { CodeIndexProvider } from '../providers/code-index-provider.js';
import { LlmProvider, resolveLlmConfig } from '../providers/llm-provider.js';
import { GitProvider } from '../providers/git-provider.js';
import { DocumentProvider } from '../providers/document-provider.js';
import { HarnessConfig } from '../mcp/harness-config.js';

export function createStudioServer({
  dbPath,
  workspacePath = process.cwd(),
  port = 3210
} = {}) {
  const store = new SqliteStore(dbPath);
  const projectService = new ProjectService(store);
  const checkpointService = new CheckpointService(store, projectService);
  const briefingService = new BriefingService(store, projectService);
  const handoffService = new HandoffService(store, projectService, checkpointService);

  let llmProvider = null;
  let llmError = null;
  try {
    const config = resolveLlmConfig(process.env, {}, workspacePath);
    llmProvider = new LlmProvider(config);
  } catch (err) {
    llmError = err.message;
  }

  const reasoningService = new ReasoningService(store, projectService, briefingService, {
    llmProvider,
    codeIndexProvider: CodeIndexProvider
  });

  function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  const server = createServer(async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
      if (pathname === '/api/status' && req.method === 'GET') {
        const project = projectService.initProject(workspacePath);
        const tasks = store.listTasks(project.project_id, 'all');
        const activeTasks = tasks.filter(t => t.status === 'active');
        const checkpoints = store.getCheckpoints(project.project_id, { limit: 100 });
        const git = GitProvider.collect(workspacePath).git;

        let driftCount = 0;
        let driftDetails = [];
        for (const task of activeTasks) {
          try {
            const briefing = briefingService.generateBriefing({
              workspacePath,
              taskId: task.task_id,
              destination: 'cli'
            });
            if (briefing.driftDetected) {
              driftCount++;
              driftDetails.push({ taskId: task.task_id, warnings: briefing.warnings });
            }
          } catch {
            // Task might have 0 checkpoints
          }
        }

        let activeLlmConfig = null;
        let activeLlmError = null;
        try {
          activeLlmConfig = resolveLlmConfig(process.env, {}, workspacePath);
        } catch (err) {
          activeLlmError = err.message;
        }

        const healthScore = Math.max(70, 100 - (driftCount * 12) - (activeTasks.length > 5 ? 5 : 0));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          project: {
            id: project.project_id,
            name: project.name,
            path: project.canonical_path
          },
          ai: {
            connected: !activeLlmError && !!activeLlmConfig,
            provider: activeLlmConfig ? activeLlmConfig.provider : 'ollama',
            model: activeLlmConfig ? activeLlmConfig.model : 'llama3.1:8b',
            baseUrl: activeLlmConfig ? activeLlmConfig.baseUrl : null,
            error: activeLlmError
          },
          tasks: {
            total: tasks.length,
            active: activeTasks.length,
            list: tasks
          },
          checkpointsCount: checkpoints.length,
          lastCheckpoint: checkpoints[checkpoints.length - 1] || null,
          git: git ? { commit: git.commit_hash, branch: git.branch, isDirty: git.is_dirty } : null,
          health: {
            score: healthScore,
            driftDetected: driftCount > 0,
            driftCount,
            driftDetails
          }
        }));
        return;
      }

      if (pathname === '/api/memory' && req.method === 'GET') {
        const project = projectService.initProject(workspacePath);
        const checkpoints = store.getCheckpoints(project.project_id);
        const allowedDocs = store.getDocumentPolicy(project.project_id);
        const codeIndex = CodeIndexProvider.build(workspacePath);

        const allDecisions = [];
        const seenDecisions = new Set();
        const allConstraints = new Set();

        for (const cp of checkpoints) {
          if (cp.claims?.decisions) {
            for (const d of cp.claims.decisions) {
              if (!seenDecisions.has(d.id)) {
                seenDecisions.add(d.id);
                allDecisions.push({ ...d, taskId: cp.task_id, timestamp: cp.timestamp });
              }
            }
          }
          if (cp.claims?.constraints) {
            for (const c of cp.claims.constraints) {
              allConstraints.add(c);
            }
          }
        }

        // Collect allowlisted docs details (sizes, hashes) safely
        let docDetails = [];
        try {
          const collected = DocumentProvider.collect(workspacePath, allowedDocs, allowedDocs);
          docDetails = (collected.documents || []).map(d => ({
            path: d.relative_path,
            size: d.size_bytes ? (d.size_bytes < 1024 ? `${d.size_bytes} B` : `${(d.size_bytes / 1024).toFixed(1)} kB`) : '0 B',
            hash: d.sha256_hash ? d.sha256_hash.slice(0, 10) + '...' : 'tracked',
            status: 'Verified'
          }));
          for (const g of (collected.gaps || [])) {
            docDetails.push({
              path: g.relative_path,
              size: 'Missing',
              hash: 'N/A',
              status: 'File Missing'
            });
          }
        } catch {
          docDetails = (allowedDocs || []).map(p => ({ path: p, size: 'Tracked', hash: 'allowlisted', status: 'Verified' }));
        }

        // Extract real top AST symbols from code index
        const topSymbols = [];
        for (const f of codeIndex.files) {
          if (f.symbols) {
            for (const c of (f.symbols.classes || [])) {
              topSymbols.push({ name: c, type: 'Class', file: f.path });
            }
            for (const fn of (f.symbols.functions || [])) {
              topSymbols.push({ name: fn, type: 'Function', file: f.path });
            }
            for (const exp of (f.symbols.exports || [])) {
              topSymbols.push({ name: exp, type: 'Export', file: f.path });
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          filesIndexed: codeIndex.files.length,
          symbolsIndexed: codeIndex.files.reduce((acc, f) => acc + ((f.symbols?.functions?.length || 0) + (f.symbols?.classes?.length || 0) + (f.symbols?.exports?.length || 0)), 0),
          allowedDocuments: allowedDocs,
          allowedDocsList: docDetails,
          topSymbols: topSymbols.slice(0, 30),
          decisions: allDecisions,
          constraints: Array.from(allConstraints),
          totalCheckpoints: checkpoints.length
        }));
        return;
      }

      if (pathname === '/api/timeline' && req.method === 'GET') {
        const project = projectService.initProject(workspacePath);
        const days = parseInt(url.searchParams.get('days') || '7', 10);
        const taskId = url.searchParams.get('taskId') || undefined;
        const recap = briefingService.generateRecap({
          workspacePath,
          days,
          taskId,
          destination: 'cli'
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          recapText: recap.recapText,
          checkpoints: recap.checkpoints,
          taskCount: recap.taskCount
        }));
        return;
      }

      if (pathname === '/api/graph' && req.method === 'GET') {
        const project = projectService.initProject(workspacePath);
        const codeIndex = CodeIndexProvider.build(workspacePath);
        const checkpoints = store.getCheckpoints(project.project_id);
        const changedFiles = new Set(GitProvider.collectChangedFiles(workspacePath).files || []);
        const requestedTaskId = url.searchParams.get('taskId') || null;

        // If a task is selected, get its allowlisted docs or touched files
        const taskCheckpoints = requestedTaskId
          ? checkpoints.filter(cp => cp.task_id === requestedTaskId)
          : checkpoints;

        // Dynamically cluster code files by architectural module
        const moduleMap = new Map();
        for (const file of codeIndex.files) {
          const parts = file.path.split('/');
          let modId = parts[0];
          if (file.path === 'src/index.js') {
            modId = 'core';
          } else if (file.path.startsWith('src/')) {
            modId = parts[1] || 'core';
          } else if (file.path.startsWith('test/')) {
            modId = 'tests';
          } else if (file.path.startsWith('wiki/')) {
            modId = 'wiki';
          } else if (file.path.startsWith('studio/')) {
            modId = 'studio-ui';
          } else if (file.path.startsWith('bin/')) {
            modId = 'cli';
          } else {
            modId = parts.length > 1 ? parts[0] : 'root';
          }

          if (!moduleMap.has(modId)) {
            const prettyNames = {
              'policy': 'Security & Boundaries',
              'storage': 'SQLite Context Store',
              'operations': 'Continuity & Handoff Services',
              'providers': 'AI LLM & AST Code Index',
              'mcp': 'Harness MCP Bridge',
              'studio': 'Studio API Server',
              'core': 'Core Hashes & Errors',
              'cli': 'Unified CLI Interface',
              'studio-ui': 'React Studio Frontend',
              'tests': 'Automated Test Suite',
              'wiki': 'Architecture Wiki',
              'root': 'Project Root & Config',
              'backend': 'Backend Services',
              'frontend': 'Frontend Application',
              'api': 'API Routes & Handlers',
              'models': 'Data Models & Schemas',
              'controllers': 'Controllers',
              'routes': 'Router Layer',
              'services': 'Domain Services',
              'utils': 'Utility Helpers'
            };
            const capitalizedMod = modId.charAt(0).toUpperCase() + modId.slice(1);
            moduleMap.set(modId, {
              id: modId,
              name: prettyNames[modId] || capitalizedMod,
              category: (modId === 'policy' || modId === 'storage' || modId === 'auth' || modId === 'security') ? 'Security' :
                        (modId === 'providers' || modId === 'ai' || modId === 'llm') ? 'AI / Copilot' :
                        (modId === 'mcp' || modId === 'api' || modId === 'routes') ? 'Integration' : 'Core',
              owner: project.name || 'Workspace',
              files: [],
              drift: false,
              dependencies: new Set(),
              symbolsCount: 0
            });
          }
          const m = moduleMap.get(modId);
          m.files.push(file.path);
          if (changedFiles.has(file.path)) {
            m.drift = true;
          }
          if (file.symbols) {
            m.symbolsCount += (file.symbols.functions?.length || 0) + (file.symbols.classes?.length || 0) + (file.symbols.exports?.length || 0);
          }
        }

        // Map codeIndex.edges to module dependencies
        for (const edge of codeIndex.edges) {
          const fromParts = edge.from.split('/');
          const toParts = edge.to.split('/');
          const fromMod = fromParts[0] === 'src' ? (fromParts[1] || 'core') : fromParts[0];
          const toMod = toParts[0] === 'src' ? (toParts[1] || 'core') : toParts[0];
          if (fromMod !== toMod && moduleMap.has(fromMod) && moduleMap.has(toMod)) {
            moduleMap.get(fromMod).dependencies.add(toMod);
          }
        }

        // Link real ADR decisions from checkpoints
        const allDecisions = [];
        for (const cp of taskCheckpoints) {
          if (cp.claims?.decisions) {
            for (const d of cp.claims.decisions) {
              allDecisions.push(`${d.id}: ${d.title || d.rationale || ''}`);
            }
          }
        }

        // Compute clean 2D grid coordinates for modules
        const modArray = Array.from(moduleMap.values());
        const cols = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(modArray.length))));
        const colWidth = 270;
        const rowHeight = 160;
        const startX = 40;
        const startY = 40;

        const connections = [];
        for (const [fromMod, mod] of moduleMap.entries()) {
          for (const toMod of mod.dependencies) {
            connections.push({ from: fromMod, to: toMod });
          }
        }

        const modules = modArray.map((m, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          return {
            ...m,
            x: startX + col * colWidth,
            y: startY + row * rowHeight,
            status: m.drift ? 'Drift Detected' : 'Verified',
            dependencies: Array.from(m.dependencies),
            decisions: allDecisions.slice(0, 3),
            files: m.files.length,
            description: `${m.files.length} file${m.files.length === 1 ? '' : 's'} · ${m.symbolsCount} symbols indexed.`
          };
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          modules,
          connections,
          activeTask: requestedTaskId,
          totalFiles: codeIndex.files.length
        }));
        return;
      }

      if (pathname === '/api/team' && req.method === 'GET') {
        const project = projectService.initProject(workspacePath);
        const checkpoints = store.getCheckpoints(project.project_id);

        const authorMap = new Map();
        for (const cp of checkpoints) {
          const name = cp.author?.name || 'developer';
          if (!authorMap.has(name)) {
            authorMap.set(name, {
              id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              name,
              role: 'Contributor',
              harness: cp.author?.harness || 'cli',
              tasks: new Set(),
              checkpointsCount: 0,
              lastActive: cp.timestamp
            });
          }
          const a = authorMap.get(name);
          a.tasks.add(cp.task_id);
          a.checkpointsCount++;
          if (new Date(cp.timestamp) > new Date(a.lastActive)) {
            a.lastActive = cp.timestamp;
            a.harness = cp.author?.harness || a.harness;
          }
        }

        const team = Array.from(authorMap.values()).map(a => ({
          ...a,
          tasks: Array.from(a.tasks)
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ team, totalCheckpoints: checkpoints.length }));
        return;
      }

      if (pathname === '/api/handoff/export' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const project = projectService.getProjectForWorkspace(workspacePath);
            const allTasks = store.listTasks(project.project_id);

            let resolvedTaskId = data.taskId;
            if (!resolvedTaskId || !allTasks.some(t => t.task_id === resolvedTaskId)) {
              const activeTask = allTasks.find(t => t.status === 'active') || allTasks[0];
              if (activeTask) {
                resolvedTaskId = activeTask.task_id;
              }
            }

            let resolvedCheckpointId = data.checkpointId || undefined;
            if (!resolvedCheckpointId && resolvedTaskId) {
              const leaves = store.getLeafCheckpoints(project.project_id, resolvedTaskId);
              if (leaves.length > 1) {
                const sorted = [...leaves].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolvedCheckpointId = sorted[0].checkpoint_id;
              }
            }

            const result = handoffService.exportHandoff({
              workspacePath,
              taskId: resolvedTaskId || 'phase-5-pilot',
              checkpointId: resolvedCheckpointId,
              recipient: data.recipient || 'Collaborator',
              destinationHarness: data.destinationHarness || 'any'
            });

            const bundle = {
              schema_version: 'vectorforce/handoff-bundle/v1',
              package_id: result.package_id,
              created_at: result.handoff?.created_at || new Date().toISOString(),
              manifest: result.manifest,
              handoff: result.handoff
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ...result, bundle }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (pathname === '/api/handoff/import' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            let targetBundlePath = data.bundlePath;

            if (!targetBundlePath && data.bundleContent) {
              const handoffsDir = join(homedir(), '.vectorforce', 'handoffs');
              mkdirSync(handoffsDir, { recursive: true, mode: 0o700 });
              const rawStr = typeof data.bundleContent === 'string'
                ? data.bundleContent
                : JSON.stringify(data.bundleContent, null, 2);
              targetBundlePath = join(handoffsDir, `import-${randomUUID().slice(0, 8)}.vfhandoff.json`);
              writeFileSync(targetBundlePath, rawStr, 'utf8');
            }

            const result = handoffService.importHandoff({
              workspacePath,
              bundlePath: targetBundlePath,
              targetTaskId: data.targetTaskId || undefined
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (pathname === '/api/reason' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const result = await reasoningService.reasonAboutTask({
              workspacePath,
              taskId: data.taskId,
              checkpointId: data.checkpointId,
              focus: data.focus || undefined,
              model: data.model || undefined,
              destination: 'cli',
              maxTokens: 4000,
              includeCode: data.includeCode !== false,
              _viaStudio: true
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (pathname === '/api/checkpoint' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const result = checkpointService.captureCheckpoint({
              workspacePath,
              taskId: data.taskId || 'main',
              summary: data.summary,
              goals: data.goals || [],
              constraints: data.constraints || [],
              decisions: data.decisions || [],
              nextSteps: data.nextSteps || [],
              requestedDocuments: data.requestedDocuments || [],
              includeGit: data.includeGit !== false,
              authorName: data.authorName || 'developer',
              authorHarness: data.authorHarness || 'studio'
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // --- Interactive Studio Configuration & Task/To-Do Endpoints ---

      if (pathname === '/api/config/llm' && req.method === 'GET') {
        let activeCfg = null;
        let error = null;
        try {
          activeCfg = resolveLlmConfig(process.env, {}, workspacePath);
        } catch (err) {
          error = err.message;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          provider: activeCfg?.provider || 'ollama',
          model: activeCfg?.model || 'llama3.3',
          baseUrl: activeCfg?.baseUrl || 'http://127.0.0.1:11434',
          hasApiKey: Boolean(activeCfg?.apiKey),
          error
        }));
        return;
      }

      if (pathname === '/api/config/llm' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const provider = String(data.provider || 'ollama').toLowerCase().trim();
            const model = String(data.model || '').trim();
            const baseUrl = String(data.baseUrl || '').trim();
            const apiKey = String(data.apiKey || '').trim();

            const vfDir = join(workspacePath, '.vectorforce');
            mkdirSync(vfDir, { recursive: true, mode: 0o700 });
            const cfgPath = join(vfDir, 'config.json');
            let existing = {};
            if (existsSync(cfgPath)) {
              try { existing = JSON.parse(readFileSync(cfgPath, 'utf8')); } catch {}
            }

            existing.VF_LLM_PROVIDER = provider;
            if (provider === 'fireworks') {
              if (apiKey) existing.FIREWORKS_API_KEY = apiKey;
              existing.VF_FIREWORKS_MODEL = model || 'accounts/fireworks/models/muse-spark-open';
              if (baseUrl) existing.VF_FIREWORKS_BASE_URL = baseUrl;
            } else if (provider === 'muse') {
              if (apiKey) existing.MODEL_API_KEY = apiKey;
              existing.VF_MUSE_MODEL = model || 'muse-spark-1.3';
              if (baseUrl) existing.VF_MUSE_BASE_URL = baseUrl;
            } else if (provider === 'openrouter') {
              if (apiKey) existing.OPENROUTER_API_KEY = apiKey;
              existing.VF_OPENROUTER_MODEL = model || 'meta/muse-spark-open';
            } else if (provider === 'ollama') {
              existing.VF_OLLAMA_MODEL = model || 'llama3.3';
              existing.VF_OLLAMA_BASE_URL = baseUrl || 'http://127.0.0.1:11434';
            } else if (provider === 'openai' || provider === 'codex') {
              if (apiKey) existing.VF_LLM_API_KEY = apiKey;
              existing.VF_LLM_MODEL = model || 'gpt-4.1';
              existing.VF_LLM_BASE_URL = baseUrl || 'https://api.openai.com/v1';
            } else if (provider === 'anthropic') {
              if (apiKey) existing.ANTHROPIC_API_KEY = apiKey;
              existing.VF_ANTHROPIC_MODEL = model || 'claude-sonnet-4-5';
              if (baseUrl) existing.VF_ANTHROPIC_BASE_URL = baseUrl;
            } else if (provider === 'byok') {
              if (apiKey) existing.VF_LLM_API_KEY = apiKey;
              if (model) existing.VF_LLM_MODEL = model;
              if (baseUrl) existing.VF_LLM_BASE_URL = baseUrl;
            }

            writeFileSync(cfgPath, JSON.stringify(existing, null, 2) + '\n', 'utf8');

            // Hot-reload reasoningService LLM provider
            let resolved = null;
            let resolveErr = null;
            try {
              resolved = resolveLlmConfig(process.env, {}, workspacePath);
              reasoningService.llmProvider = new LlmProvider(resolved);
            } catch (err) {
              resolveErr = err.message;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: true,
              provider: resolved?.provider || provider,
              model: resolved?.model || model,
              baseUrl: resolved?.baseUrl || baseUrl,
              hasApiKey: Boolean(resolved?.apiKey || apiKey),
              error: resolveErr
            }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (pathname === '/api/policy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const project = projectService.initProject(workspacePath);
            const current = store.getDocumentPolicy(project.project_id);
            let nextList = [...current];
            if (Array.isArray(data.allowedDocuments)) {
              nextList = data.allowedDocuments;
            } else if (data.action === 'remove' && data.path) {
              nextList = current.filter(p => p !== data.path);
            } else if (data.path) {
              if (!nextList.includes(data.path)) nextList.push(data.path);
            }
            const updated = store.setDocumentPolicy(project.project_id, nextList);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, allowedDocuments: updated }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (pathname === '/api/config/harnesses' && req.method === 'POST') {
        try {
          const agy = HarnessConfig.installAntigravity(workspacePath);
          const cmd = HarnessConfig.installCommandCode(workspacePath);
          const muse = HarnessConfig.installMuseCode(workspacePath);
          const codex = HarnessConfig.installCodex(workspacePath);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            installed: [
              { harness: 'Google Antigravity', path: agy },
              { harness: 'Claude Code & Command Code', path: cmd },
              { harness: 'Meta Muse', path: muse },
              { harness: 'OpenAI Codex CLI', path: codex }
            ]
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      if (pathname === '/api/tasks' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            if (data.action === 'status' && data.taskId && data.status) {
              const updated = projectService.updateTaskStatus(workspacePath, data.taskId, data.status);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, task: updated }));
              return;
            }
            const taskId = String(data.taskId || '').trim();
            const title = String(data.title || taskId).trim();
            if (!taskId) throw new Error('taskId is required');
            const created = projectService.createTask(workspacePath, taskId, title);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, task: created }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (pathname === '/api/todos' && (req.method === 'GET' || req.method === 'POST')) {
        const vfDir = join(workspacePath, '.vectorforce');
        mkdirSync(vfDir, { recursive: true, mode: 0o700 });
        const todosPath = join(vfDir, 'todos.json');

        const loadTodos = () => {
          if (existsSync(todosPath)) {
            try { return JSON.parse(readFileSync(todosPath, 'utf8')); } catch {}
          }
          // Auto-seed from latest checkpoint next_steps & goals
          const project = projectService.initProject(workspacePath);
          const cps = store.getCheckpoints(project.project_id, { limit: 10 });
          const latest = cps[cps.length - 1];
          const seeded = [];
          if (latest?.claims?.next_steps) {
            for (const step of latest.claims.next_steps) {
              seeded.push({
                id: `todo-${Math.random().toString(36).slice(2, 9)}`,
                text: step,
                taskId: latest.task_id,
                done: false,
                createdAt: latest.timestamp
              });
            }
          }
          if (seeded.length > 0) {
            writeFileSync(todosPath, JSON.stringify(seeded, null, 2) + '\n', 'utf8');
          }
          return seeded;
        };

        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ todos: loadTodos() }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            let todos = loadTodos();
            if (data.action === 'add' && data.text) {
              todos.unshift({
                id: `todo-${Date.now().toString(36)}`,
                text: String(data.text).trim(),
                taskId: data.taskId || 'main',
                done: false,
                createdAt: new Date().toISOString()
              });
            } else if (data.action === 'toggle' && data.id) {
              todos = todos.map(t => t.id === data.id ? { ...t, done: !t.done } : t);
            } else if (data.action === 'delete' && data.id) {
              todos = todos.filter(t => t.id !== data.id);
            } else if (Array.isArray(data.todos)) {
              todos = data.todos;
            }
            writeFileSync(todosPath, JSON.stringify(todos, null, 2) + '\n', 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, todos }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // Serve static assets from studio/dist for standalone Studio UI
      const bundledDist = fileURLToPath(new URL('../../studio/dist', import.meta.url));
      const workspaceDist = join(workspacePath, 'studio', 'dist');
      const distDir = existsSync(workspaceDist) ? workspaceDist : bundledDist;
      if (existsSync(distDir)) {
        let filePath = join(distDir, pathname === '/' ? 'index.html' : pathname.slice(1));
        if (!existsSync(filePath)) {
          filePath = join(distDir, 'index.html');
        }
        if (existsSync(filePath)) {
          const ext = extname(filePath).toLowerCase();
          const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml'
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          const content = readFileSync(filePath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
          return;
        }
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#090d16;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:90vh;text-align:center;">
          <h1 style="color:#60a5fa;margin-bottom:8px;">VectorForce Studio API is Active</h1>
          <p style="color:#94a3b8;max-width:500px;line-height:1.6;">The backend is connected to SQLite and serving APIs at <a href="/api/status" style="color:#38bdf8;">/api/status</a>. To build the UI bundle, run:<br/><code style="background:#1e293b;padding:4px 8px;border-radius:4px;color:#a5b4fc;display:inline-block;margin-top:12px;">cd studio &amp;&amp; npm install &amp;&amp; npm run build</code></p>
        </body></html>`);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    } catch (err) {
      console.error('SERVER CATCH ERROR:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  });

  return {
    server,
    start() {
      return new Promise((resolve) => {
        server.listen(port, () => {
          resolve(`http://localhost:${port}`);
        });
      });
    },
    stop() {
      return new Promise((resolve) => {
        store.close();
        server.close(resolve);
      });
    }
  };
}
