import test from 'node:test';
import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import { createTestFixture } from './helpers/fixtures.js';
import { McpServer, MCP_PROTOCOL_VERSION } from '../src/mcp/mcp-server.js';
import { HarnessConfig } from '../src/mcp/harness-config.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function createMcpClient(server) {
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();

  server.connect(clientToServer, serverToClient);

  let buffer = '';
  const responses = [];
  const waiters = [];

  serverToClient.setEncoding('utf8');
  serverToClient.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.length > 0) {
        const parsed = JSON.parse(line);
        if (waiters.length > 0) {
          const resolve = waiters.shift();
          resolve(parsed);
        } else {
          responses.push(parsed);
        }
      }
    }
  });

  return {
    send(req) {
      return new Promise((resolve) => {
        waiters.push(resolve);
        clientToServer.write(JSON.stringify(req) + '\n');
      });
    },
    notify(notif) {
      clientToServer.write(JSON.stringify(notif) + '\n');
    }
  };
}

test('MCP: Handshake (initialize) and ping', async () => {
  const fixture = createTestFixture();
  try {
    const server = new McpServer({
      store: fixture.store,
      projectService: fixture.projectService,
      checkpointService: fixture.checkpointService,
      briefingService: fixture.briefingService
    }, fixture.workspacePath);

    const client = createMcpClient(server);

    // 1. initialize
    const initRes = await client.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        clientInfo: { name: 'antigravity-test', version: '1.0.0' }
      }
    });

    assert.strictEqual(initRes.id, 1);
    assert.strictEqual(initRes.result.protocolVersion, MCP_PROTOCOL_VERSION);
    assert.strictEqual(initRes.result.serverInfo.name, 'vectorforce');
    assert.ok(initRes.result.capabilities.tools);

    // 2. initialized notification
    client.notify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });

    // 3. ping
    const pingRes = await client.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'ping'
    });
    assert.strictEqual(pingRes.id, 2);
    assert.deepStrictEqual(pingRes.result, {});
  } finally {
    fixture.cleanup();
  }
});

test('MCP: tools/list returns all required tools', async () => {
  const fixture = createTestFixture();
  try {
    const server = new McpServer({
      store: fixture.store,
      projectService: fixture.projectService,
      checkpointService: fixture.checkpointService,
      briefingService: fixture.briefingService
    }, fixture.workspacePath);

    const client = createMcpClient(server);

    const res = await client.send({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/list'
    });

    assert.strictEqual(res.id, 10);
    const toolNames = res.result.tools.map(t => t.name);
    assert.ok(toolNames.includes('save_checkpoint'));
    assert.ok(toolNames.includes('get_resume_briefing'));
    assert.ok(toolNames.includes('list_tasks'));
    assert.ok(toolNames.includes('check_workspace_drift'));
    assert.ok(toolNames.includes('set_document_policy'));
    assert.ok(toolNames.includes('reason_about_task'));
  } finally {
    fixture.cleanup();
  }
});

test('MCP: End-to-end tool execution (save_checkpoint -> get_resume_briefing -> check_workspace_drift)', async () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'mcp-task', 'MCP Verification Task');

    const server = new McpServer({
      store: fixture.store,
      projectService: fixture.projectService,
      checkpointService: fixture.checkpointService,
      briefingService: fixture.briefingService
    }, fixture.workspacePath);

    const client = createMcpClient(server);

    // 1. save_checkpoint
    const saveRes = await client.send({
      jsonrpc: '2.0',
      id: 101,
      method: 'tools/call',
      params: {
        name: 'save_checkpoint',
        arguments: {
          task_id: 'mcp-task',
          summary: 'Checkpoint captured via MCP tool',
          goals: ['Validate MCP integration'],
          constraints: ['Strict JSON-RPC 2.0'],
          decisions: [{ id: 'DEC-MCP', title: 'Stdio MCP', rationale: 'Shared bridge for Antigravity and Command Code' }],
          next_steps: ['Resume in Command Code'],
          include_git: false
        }
      }
    });

    assert.strictEqual(saveRes.id, 101);
    assert.strictEqual(saveRes.result.isError, false);
    const receipt = JSON.parse(saveRes.result.content[0].text);
    assert.strictEqual(receipt.status, 'committed');
    assert.ok(receipt.reference_id);

    // 2. get_resume_briefing
    const resumeRes = await client.send({
      jsonrpc: '2.0',
      id: 102,
      method: 'tools/call',
      params: {
        name: 'get_resume_briefing',
        arguments: {
          task_id: 'mcp-task',
          destination_harness: 'command-code'
        }
      }
    });

    assert.strictEqual(resumeRes.id, 102);
    assert.strictEqual(resumeRes.result.isError, false);
    const briefingText = resumeRes.result.content[0].text;
    assert.ok(briefingText.includes('# Task Briefing: MCP Verification Task (`mcp-task`)'));
    assert.ok(briefingText.includes('⚠️ Strict JSON-RPC 2.0'));
    assert.ok(briefingText.includes('DEC-MCP: Stdio MCP'));

    // 3. check_workspace_drift
    const driftRes = await client.send({
      jsonrpc: '2.0',
      id: 103,
      method: 'tools/call',
      params: {
        name: 'check_workspace_drift',
        arguments: {
          task_id: 'mcp-task'
        }
      }
    });

    assert.strictEqual(driftRes.id, 103);
    const driftSummary = JSON.parse(driftRes.result.content[0].text);
    assert.strictEqual(driftSummary.drift_detected, false);

    // 4. list_tasks
    const listRes = await client.send({
      jsonrpc: '2.0',
      id: 104,
      method: 'tools/call',
      params: {
        name: 'list_tasks',
        arguments: { status: 'active' }
      }
    });

    assert.strictEqual(listRes.id, 104);
    const taskList = JSON.parse(listRes.result.content[0].text);
    assert.strictEqual(taskList.tasks.length, 1);
    assert.strictEqual(taskList.tasks[0].task_id, 'mcp-task');
  } finally {
    fixture.cleanup();
  }
});

test('HarnessConfig: Reversible Antigravity installation and uninstall', () => {
  const fixture = createTestFixture();
  try {
    // 1. Preview
    const preview = HarnessConfig.previewAntigravity(fixture.workspacePath);
    assert.strictEqual(preview.exists, false);
    assert.ok(preview.mergedContent.mcpServers.vectorforce);

    // 2. Install
    const installedPath = HarnessConfig.installAntigravity(fixture.workspacePath);
    assert.ok(existsSync(installedPath));

    const installedJson = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(installedJson.mcpServers.vectorforce.command, HarnessConfig.getNodeCommand());
    assert.ok(installedJson.mcpServers.vectorforce.args.includes('mcp'));

    // 3. Re-install is idempotent (does not duplicate)
    HarnessConfig.installAntigravity(fixture.workspacePath);
    const rechecked = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.deepStrictEqual(rechecked, installedJson);

    // 4. Uninstall reversibly removes vectorforce entry
    const removed = HarnessConfig.uninstallAntigravity(fixture.workspacePath);
    assert.strictEqual(removed, true);

    const postUninstall = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(postUninstall.mcpServers.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('HarnessConfig: Reversible Command Code installation and uninstall', () => {
  const fixture = createTestFixture();
  try {
    const preview = HarnessConfig.previewCommandCode(fixture.workspacePath);
    assert.ok(preview.cliCommand.includes('cmd mcp add --transport stdio vectorforce'));

    const installedPath = HarnessConfig.installCommandCode(fixture.workspacePath);
    assert.ok(existsSync(installedPath));

    const config = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.ok(config.mcpServers.vectorforce);

    const removed = HarnessConfig.uninstallCommandCode(fixture.workspacePath);
    assert.strictEqual(removed, true);

    const post = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(post.mcpServers.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('HarnessConfig: Reversible Muse Code installation and uninstall', () => {
  const fixture = createTestFixture();
  try {
    const preview = HarnessConfig.previewMuseCode(fixture.workspacePath);
    assert.ok(preview.filePath.includes('.muse'));

    const installedPath = HarnessConfig.installMuseCode(fixture.workspacePath);
    assert.ok(existsSync(installedPath));

    const config = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.ok(config.mcpServers.vectorforce);

    const removed = HarnessConfig.uninstallMuseCode(fixture.workspacePath);
    assert.strictEqual(removed, true);

    const post = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(post.mcpServers.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('HarnessConfig: Reversible Codex installation and uninstall', () => {
  const fixture = createTestFixture();
  try {
    const preview = HarnessConfig.previewCodex(fixture.workspacePath);
    assert.ok(preview.filePath.includes('.codex'));
    assert.ok(preview.cliCommand.includes('codex mcp add vectorforce'));
    assert.ok(preview.mergedContent.includes('[mcp_servers.vectorforce]'));

    // Install
    const installedPath = HarnessConfig.installCodex(fixture.workspacePath);
    assert.ok(existsSync(installedPath));
    assert.ok(existsSync(preview.codexJsonPath));

    const tomlContent = readFileSync(installedPath, 'utf8');
    assert.ok(tomlContent.includes('[mcp_servers.vectorforce]'));
    assert.ok(tomlContent.includes('VF_HARNESS = "codex"'));

    const jsonConfig = JSON.parse(readFileSync(preview.codexJsonPath, 'utf8'));
    assert.ok(jsonConfig.mcpServers.vectorforce);

    // Re-install is idempotent
    HarnessConfig.installCodex(fixture.workspacePath);
    const tomlContent2 = readFileSync(installedPath, 'utf8');
    assert.strictEqual(tomlContent2, tomlContent);

    // Uninstall
    const removed = HarnessConfig.uninstallCodex(fixture.workspacePath);
    assert.strictEqual(removed, true);

    const postToml = readFileSync(installedPath, 'utf8');
    assert.ok(!postToml.includes('[mcp_servers.vectorforce]'));

    const postJson = JSON.parse(readFileSync(preview.codexJsonPath, 'utf8'));
    assert.strictEqual(postJson.mcpServers.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('HarnessConfig: Reversible Cursor installation and uninstall', () => {
  const fixture = createTestFixture();
  try {
    const preview = HarnessConfig.previewCursor(fixture.workspacePath);
    assert.ok(preview.filePath.includes('.cursor'));
    assert.ok(preview.mergedContent.mcpServers.vectorforce);

    // Install
    const installedPath = HarnessConfig.installCursor(fixture.workspacePath);
    assert.ok(existsSync(installedPath));
    assert.ok(existsSync(join(fixture.workspacePath, '.cursorrules')));

    const config = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(config.mcpServers.vectorforce.command, HarnessConfig.getNodeCommand());
    assert.strictEqual(config.mcpServers.vectorforce.env.VF_HARNESS, 'cursor');

    // Uninstall
    const removed = HarnessConfig.uninstallCursor(fixture.workspacePath);
    assert.strictEqual(removed, true);

    const post = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(post.mcpServers.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('HarnessConfig: Reversible Windsurf installation and uninstall', () => {
  const fixture = createTestFixture();
  try {
    const preview = HarnessConfig.previewWindsurf(fixture.workspacePath);
    assert.ok(preview.filePath.includes('.windsurf'));
    assert.ok(preview.mergedContent.mcpServers.vectorforce);

    // Install
    const installedPath = HarnessConfig.installWindsurf(fixture.workspacePath);
    assert.ok(existsSync(installedPath));
    assert.ok(existsSync(join(fixture.workspacePath, '.windsurfrules')));

    const config = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(config.mcpServers.vectorforce.command, HarnessConfig.getNodeCommand());
    assert.strictEqual(config.mcpServers.vectorforce.env.VF_HARNESS, 'windsurf');

    // Uninstall
    const removed = HarnessConfig.uninstallWindsurf(fixture.workspacePath);
    assert.strictEqual(removed, true);

    const post = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(post.mcpServers.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('HarnessConfig: Reversible GitHub Copilot installation and uninstall', () => {
  const fixture = createTestFixture();
  try {
    const preview = HarnessConfig.previewCopilot(fixture.workspacePath);
    assert.ok(preview.filePath.includes('.vscode'));
    assert.ok(preview.mergedContent.servers.vectorforce);

    // Install
    const installedPath = HarnessConfig.installCopilot(fixture.workspacePath);
    assert.ok(existsSync(installedPath));
    assert.ok(existsSync(join(fixture.workspacePath, '.github', 'copilot-instructions.md')));

    const config = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(config.servers.vectorforce.command, HarnessConfig.getNodeCommand());
    assert.strictEqual(config.servers.vectorforce.env.VF_HARNESS, 'copilot');

    // Uninstall
    const removed = HarnessConfig.uninstallCopilot(fixture.workspacePath);
    assert.strictEqual(removed, true);

    const post = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(post.servers?.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('HarnessConfig: Reversible Kiro IDE installation and uninstall', () => {
  const fixture = createTestFixture();
  try {
    const preview = HarnessConfig.previewKiro(fixture.workspacePath);
    assert.ok(preview.filePath.includes('.kiro'));
    assert.ok(preview.mergedContent.mcpServers.vectorforce);

    // Install
    const installedPath = HarnessConfig.installKiro(fixture.workspacePath);
    assert.ok(existsSync(installedPath));
    assert.ok(existsSync(preview.kiroJsonPath));
    assert.ok(existsSync(join(fixture.workspacePath, '.kiro', 'steering', 'vectorforce.md')));

    const config = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(config.mcpServers.vectorforce.command, HarnessConfig.getNodeCommand());
    assert.strictEqual(config.mcpServers.vectorforce.env.VF_HARNESS, 'kiro');

    // Uninstall
    const removed = HarnessConfig.uninstallKiro(fixture.workspacePath);
    assert.strictEqual(removed, true);

    const post = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(post.mcpServers.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('MCP: reason_about_task returns an AI narrative and header', async () => {
  const fixture = createTestFixture();
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'reason-task', 'Reason Task');
    fixture.checkpointService.captureCheckpoint({
      workspacePath: fixture.workspacePath,
      taskId: 'reason-task',
      summary: 'Captured work for reasoning',
      goals: ['Ship reasoning'],
      constraints: [],
      nextSteps: [],
      includeGit: false,
      authorName: 'tester',
      authorHarness: 'cli'
    });

    const server = new McpServer({
      store: fixture.store,
      projectService: fixture.projectService,
      checkpointService: fixture.checkpointService,
      briefingService: fixture.briefingService,
      reasoningService: fixture.reasoningService
    }, fixture.workspacePath);

    const client = createMcpClient(server);
    const res = await client.send({
      jsonrpc: '2.0',
      id: 900,
      method: 'tools/call',
      params: { name: 'reason_about_task', arguments: { task_id: 'reason-task' } }
    });

    assert.strictEqual(res.result.isError, false);
    assert.ok(res.result.content[0].text.includes('Where you left off'));
    const header = JSON.parse(res.result.content[1].text);
    assert.strictEqual(header.degraded, false);
    assert.strictEqual(header.task_id, 'reason-task');
  } finally {
    fixture.cleanup();
  }
});
