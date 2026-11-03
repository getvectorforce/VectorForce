import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorCode, VectorForceError } from '../core/errors.js';

export const MCP_PROTOCOL_VERSION = '2025-11-25';

export const MCP_SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05'
];

function readServerVersion() {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version || '0.3.2';
  } catch {
    return '0.3.2';
  }
}

export const MCP_SERVER_VERSION = readServerVersion();

export function negotiateProtocolVersion(clientVersion) {
  if (clientVersion && MCP_SUPPORTED_PROTOCOL_VERSIONS.includes(clientVersion)) {
    return clientVersion;
  }
  return MCP_PROTOCOL_VERSION;
}

export const MCP_TOOLS = [
  {
    name: 'save_checkpoint',
    description: 'Capture an immutable, policy-bounded checkpoint of the current engineering task.',
    inputSchema: {
      type: 'object',
      required: ['task_id', 'summary', 'goals', 'constraints'],
      properties: {
        task_id: { type: 'string', description: 'Kebab-case task slug' },
        summary: { type: 'string', description: 'Concise summary of progress and current state' },
        goals: { type: 'array', items: { type: 'string' }, description: 'Active objectives' },
        constraints: { type: 'array', items: { type: 'string' }, description: 'Non-negotiable architectural invariants' },
        decisions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'title', 'rationale'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              rationale: { type: 'string' }
            }
          },
          description: 'Key architectural choices made during this step'
        },
        next_steps: { type: 'array', items: { type: 'string' }, description: 'Immediate upcoming tasks' },
        open_questions: { type: 'array', items: { type: 'string' } },
        include_git: { type: 'boolean', default: true },
        requested_documents: { type: 'array', items: { type: 'string' }, description: 'Allowlisted relative document paths' }
      }
    }
  },
  {
    name: 'get_resume_briefing',
    description: 'Retrieve an authorized, bounded resume briefing for a specific task and checkpoint.',
    inputSchema: {
      type: 'object',
      required: ['task_id'],
      properties: {
        task_id: { type: 'string' },
        checkpoint_id: { type: 'string', description: 'Optional specific checkpoint ID. Defaults to latest head.' },
        max_tokens: { type: 'integer', default: 4000, maximum: 8000 },
        destination_harness: { type: 'string', enum: ['antigravity', 'command-code', 'muse', 'muse-code', 'pi', 'codex', 'cli', 'cursor', 'windsurf', 'github-copilot', 'copilot', 'kiro', 'kiro-ide'] }
      }
    }
  },
  {
    name: 'list_tasks',
    description: 'List engineering tasks registered in the active workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'completed', 'abandoned', 'all'], default: 'active' }
      }
    }
  },
  {
    name: 'check_workspace_drift',
    description: 'Compare current workspace Git state and document hashes against the last recorded checkpoint.',
    inputSchema: {
      type: 'object',
      required: ['task_id'],
      properties: {
        task_id: { type: 'string' },
        checkpoint_id: { type: 'string' }
      }
    }
  },
  {
    name: 'set_document_policy',
    description: 'Update the exact allowlist of document paths that can be captured in checkpoints.',
    inputSchema: {
      type: 'object',
      required: ['allowed_paths'],
      properties: {
        allowed_paths: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    name: 'export_handoff',
    description: 'Export an authorized, boundary-safe handoff package for another developer or team.',
    inputSchema: {
      type: 'object',
      required: ['task_id', 'recipient'],
      properties: {
        task_id: { type: 'string', description: 'Kebab-case task slug' },
        recipient: { type: 'string', description: 'Target developer or audience identity' },
        checkpoint_id: { type: 'string', description: 'Optional specific checkpoint ID to export' },
        destination_harness: { type: 'string', enum: ['antigravity', 'command-code', 'muse', 'muse-code', 'pi', 'codex', 'cli', 'cursor', 'windsurf', 'github-copilot', 'copilot', 'kiro', 'kiro-ide', 'any'], default: 'any' },
        preview: { type: 'boolean', default: false, description: 'Dry run preview without writing file' },
        out_path: { type: 'string', description: 'Optional custom bundle file destination' }
      }
    }
  },
  {
    name: 'import_handoff',
    description: 'Import a verified handoff package into the current workspace with explicit context reconciliation.',
    inputSchema: {
      type: 'object',
      required: ['bundle_path'],
      properties: {
        bundle_path: { type: 'string', description: 'Path to handoff bundle JSON file' },
        target_task_id: { type: 'string', description: 'Optional target task ID to import into' }
      }
    }
  },
  {
    name: 'get_timeline',
    description: 'Retrieve a chronological timeline and weekly recap of engineering checkpoints, decisions, and progress.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'integer', default: 7, description: 'Number of past days to include in the recap (defaults to 7)' },
        task_id: { type: 'string', description: 'Optional specific task ID to filter by' },
        destination_harness: { type: 'string', enum: ['antigravity', 'command-code', 'muse', 'muse-code', 'pi', 'codex', 'cli', 'cursor', 'windsurf', 'github-copilot', 'copilot', 'kiro', 'kiro-ide'] }
      }
    }
  },
  {
    name: 'reason_about_task',
    description: 'Reason over the full engineering memory (checkpoints, decisions, constraints, drift) and the live codebase with Llama to produce a narrative continuation briefing, risk analysis, and recommended next actions.',
    inputSchema: {
      type: 'object',
      required: ['task_id'],
      properties: {
        task_id: { type: 'string', description: 'Kebab-case task slug' },
        checkpoint_id: { type: 'string', description: 'Optional specific checkpoint ID. Defaults to latest head.' },
        destination_harness: { type: 'string', enum: ['antigravity', 'command-code', 'muse', 'muse-code', 'pi', 'codex', 'cli', 'cursor', 'windsurf', 'github-copilot', 'copilot', 'kiro', 'kiro-ide'] },
        model: { type: 'string', description: 'Optional model override (e.g. a Meta Llama or Muse model id)' },
        focus: { type: 'string', description: 'Optional question or focus for the reasoning pass' },
        include_code: { type: 'boolean', default: true, description: 'Ground reasoning in the live codebase index' }
      }
    }
  }
];

export class McpServer {
  /**
   * @param {object} services
   * @param {import('../storage/sqlite-store.js').SqliteStore} services.store
   * @param {import('../operations/project-service.js').ProjectService} services.projectService
   * @param {import('../operations/checkpoint-service.js').CheckpointService} services.checkpointService
   * @param {import('../operations/briefing-service.js').BriefingService} services.briefingService
   * @param {import('../operations/handoff-service.js').HandoffService} [services.handoffService]
   * @param {import('../operations/reasoning-service.js').ReasoningService} [services.reasoningService]
   * @param {string} [workspacePath]
   */
  constructor(services, workspacePath = process.cwd()) {
    this.store = services.store;
    this.projectService = services.projectService;
    this.checkpointService = services.checkpointService;
    this.briefingService = services.briefingService;
    this.handoffService = services.handoffService;
    this.reasoningService = services.reasoningService;
    this.workspacePath = workspacePath;
    this.buffer = '';
  }

  /**
   * Connect to readable and writable streams (typically stdin and stdout).
   * @param {import('node:stream').Readable} inStream
   * @param {import('node:stream').Writable} outStream
   */
  connect(inStream, outStream) {
    this.outStream = outStream;

    inStream.setEncoding('utf8');
    inStream.on('data', (chunk) => {
      this.buffer += chunk;
      let newlineIndex;
      while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, newlineIndex).trim();
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (line.length > 0) {
          this._handleLine(line);
        }
      }
    });
  }

  _send(message) {
    if (this.outStream && !this.outStream.destroyed) {
      this.outStream.write(JSON.stringify(message) + '\n');
    }
  }

  _sendResult(id, result) {
    this._send({
      jsonrpc: '2.0',
      id,
      result
    });
  }

  _sendError(id, code, message, data = null) {
    this._send({
      jsonrpc: '2.0',
      id,
      error: { code, message, data }
    });
  }

  _handleLine(line) {
    let req;
    try {
      req = JSON.parse(line);
    } catch (err) {
      this._sendError(null, -32700, `Parse error: ${err.message}`);
      return;
    }

    // JSON-RPC batch: dispatch each entry; entries without an id are notifications.
    if (Array.isArray(req)) {
      if (req.length === 0) {
        this._sendError(null, -32600, 'Invalid Request: empty batch');
        return;
      }
      for (const sub of req) {
        this._dispatch(sub);
      }
      return;
    }

    this._dispatch(req);
  }

  _dispatch(req) {
    if (!req || typeof req !== 'object' || Array.isArray(req)) {
      this._sendError(null, -32600, 'Invalid Request');
      return;
    }

    const { id, method, params } = req;

    // Notifications (no id) are acknowledged silently, never answered.
    if (id === undefined || id === null) {
      return;
    }

    try {
      switch (method) {
        case 'initialize': {
          this._sendResult(id, {
            protocolVersion: negotiateProtocolVersion(params?.protocolVersion),
            serverInfo: {
              name: 'vectorforce',
              version: MCP_SERVER_VERSION
            },
            capabilities: {
              tools: {
                listChanged: false
              },
              resources: {},
              prompts: {}
            }
          });
          break;
        }

        case 'ping': {
          this._sendResult(id, {});
          break;
        }

        case 'tools/list': {
          this._sendResult(id, {
            tools: MCP_TOOLS
          });
          break;
        }

        case 'resources/list': {
          this._sendResult(id, { resources: [] });
          break;
        }

        case 'resources/templates/list': {
          this._sendResult(id, { resourceTemplates: [] });
          break;
        }

        case 'resources/read': {
          this._sendError(id, -32602, `Unknown resource: ${params?.uri || '(missing uri)'}`);
          break;
        }

        case 'prompts/list': {
          this._sendResult(id, { prompts: [] });
          break;
        }

        case 'prompts/get': {
          this._sendError(id, -32602, `Unknown prompt: ${params?.name || '(missing name)'}`);
          break;
        }

        case 'tools/call': {
          this._handleToolCall(id, params);
          break;
        }

        default:
          this._sendError(id, -32601, `Method not found: ${method}`);
          break;
      }
    } catch (err) {
      this._sendError(id, -32603, `Internal error: ${err.message}`);
    }
  }

  _handleToolCall(id, params) {
    if (!params || !params.name) {
      this._sendError(id, -32602, 'Invalid params: tool name required');
      return;
    }

    const toolName = params.name;
    const args = params.arguments || {};

    try {
      switch (toolName) {
        case 'save_checkpoint': {
          const receipt = this.checkpointService.captureCheckpoint({
            workspacePath: this.workspacePath,
            taskId: args.task_id,
            summary: args.summary,
            goals: args.goals || [],
            constraints: args.constraints || [],
            decisions: args.decisions || [],
            nextSteps: args.next_steps || [],
            openQuestions: args.open_questions || [],
            requestedDocuments: args.requested_documents || [],
            includeGit: args.include_git !== false,
            authorName: 'agent',
            authorHarness: process.env.VF_HARNESS || 'antigravity'
          });

          this._sendResult(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(receipt, null, 2)
              }
            ],
            isError: false
          });
          break;
        }

        case 'get_resume_briefing': {
          const result = this.briefingService.generateBriefing({
            workspacePath: this.workspacePath,
            taskId: args.task_id,
            checkpointId: args.checkpoint_id,
            destination: args.destination_harness || process.env.VF_HARNESS || 'antigravity',
            maxTokens: args.max_tokens || 4000
          });

          this._sendResult(id, {
            content: [
              {
                type: 'text',
                text: result.briefingText
              }
            ],
            isError: false
          });
          break;
        }

        case 'list_tasks': {
          const project = this.projectService.getProjectForWorkspace(this.workspacePath);
          const tasks = this.store.listTasks(project.project_id, args.status || 'active');
          this._sendResult(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ project: project.name, tasks }, null, 2)
              }
            ],
            isError: false
          });
          break;
        }

        case 'check_workspace_drift': {
          const result = this.briefingService.generateBriefing({
            workspacePath: this.workspacePath,
            taskId: args.task_id,
            checkpointId: args.checkpoint_id,
            destination: 'cli'
          });

          const summary = {
            task_id: args.task_id,
            drift_detected: result.driftDetected,
            warnings: result.warnings
          };

          this._sendResult(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(summary, null, 2)
              }
            ],
            isError: false
          });
          break;
        }

        case 'set_document_policy': {
          const project = this.projectService.getProjectForWorkspace(this.workspacePath);
          const updated = this.store.setDocumentPolicy(project.project_id, args.allowed_paths || []);
          this._sendResult(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ project_id: project.project_id, allowed_paths: updated }, null, 2)
              }
            ],
            isError: false
          });
          break;
        }

        case 'export_handoff': {
          if (!this.handoffService) {
            throw new VectorForceError(ErrorCode.INTERNAL_STORE_ERROR, 'HandoffService is not configured on this server');
          }
          const result = this.handoffService.exportHandoff({
            workspacePath: this.workspacePath,
            taskId: args.task_id,
            checkpointId: args.checkpoint_id,
            recipient: args.recipient,
            destinationHarness: args.destination_harness,
            preview: args.preview === true,
            outPath: args.out_path
          });

          this._sendResult(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.preview ? result : result.receipt, null, 2)
              }
            ],
            isError: false
          });
          break;
        }

        case 'import_handoff': {
          if (!this.handoffService) {
            throw new VectorForceError(ErrorCode.INTERNAL_STORE_ERROR, 'HandoffService is not configured on this server');
          }
          const result = this.handoffService.importHandoff({
            workspacePath: this.workspacePath,
            bundlePath: args.bundle_path,
            targetTaskId: args.target_task_id
          });

          this._sendResult(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.receipt, null, 2)
              }
            ],
            isError: false
          });
          break;
        }

        case 'get_timeline': {
          const result = this.briefingService.generateRecap({
            workspacePath: this.workspacePath,
            days: args.days ?? 7,
            taskId: args.task_id,
            destination: args.destination_harness || process.env.VF_HARNESS || 'antigravity'
          });

          this._sendResult(id, {
            content: [
              {
                type: 'text',
                text: result.recapText
              }
            ],
            isError: false
          });
          break;
        }

        case 'reason_about_task': {
          if (!this.reasoningService) {
            throw new VectorForceError(ErrorCode.INTERNAL_STORE_ERROR, 'ReasoningService is not configured on this server');
          }
          this.reasoningService.reasonAboutTask({
            workspacePath: this.workspacePath,
            taskId: args.task_id,
            checkpointId: args.checkpoint_id,
            destination: args.destination_harness || process.env.VF_HARNESS || 'cli',
            model: args.model,
            focus: args.focus,
            includeCode: args.include_code !== false
          }).then((result) => {
            const header = {
              task_id: args.task_id,
              degraded: result.degraded,
              provider: result.provider,
              model: result.model,
              drift_detected: result.driftDetected,
              code_files_considered: result.codeFilesConsidered
            };
            this._sendResult(id, {
              content: [
                { type: 'text', text: result.narrativeText },
                { type: 'text', text: JSON.stringify(header, null, 2) }
              ],
              isError: false
            });
          }).catch((err) => {
            this._sendResult(id, {
              content: [{ type: 'text', text: `Tool error: ${err.message}` }],
              isError: true
            });
          });
          break;
        }

        default:
          this._sendResult(id, {
            content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
            isError: true
          });
          break;
      }
    } catch (err) {
      this._sendResult(id, {
        content: [{ type: 'text', text: `Tool error: ${err.message}` }],
        isError: true
      });
    }
  }
}
