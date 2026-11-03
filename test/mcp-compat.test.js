import test from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTestFixture } from './helpers/fixtures.js';
import { HarnessConfig } from '../src/mcp/harness-config.js';
import { McpServer, MCP_PROTOCOL_VERSION, MCP_SUPPORTED_PROTOCOL_VERSIONS, negotiateProtocolVersion, MCP_SERVER_VERSION } from '../src/mcp/mcp-server.js';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';

test('Compat: generated entries use the absolute node runtime with stdio type', () => {
  const entries = [
    HarnessConfig.getAntigravityServerEntry(),
    HarnessConfig.getCommandCodeServerEntry(),
    HarnessConfig.getMuseCodeServerEntry(),
    HarnessConfig.getCodexServerEntry(),
    HarnessConfig.getCursorServerEntry(),
    HarnessConfig.getWindsurfServerEntry(),
    HarnessConfig.getCopilotServerEntry(),
    HarnessConfig.getKiroServerEntry()
  ];
  for (const entry of entries) {
    assert.strictEqual(entry.command, process.execPath);
    assert.strictEqual(entry.type, 'stdio');
    assert.ok(entry.args.includes('mcp'));
  }
});

test('Compat: Copilot writes the VS Code servers key and migrates legacy mcpServers', () => {
  const fixture = createTestFixture();
  try {
    // Legacy shape previous releases wrote (VS Code ignores top-level mcpServers).
    const vscodeDir = join(fixture.workspacePath, '.vscode');
    mkdirSync(vscodeDir, { recursive: true });
    writeFileSync(join(vscodeDir, 'mcp.json'), JSON.stringify({ mcpServers: { vectorforce: { command: 'node', args: ['old'] } } }), 'utf8');

    const installedPath = HarnessConfig.installCopilot(fixture.workspacePath);
    const config = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.ok(config.servers.vectorforce);
    assert.strictEqual(config.servers.vectorforce.type, 'stdio');
    assert.strictEqual(config.servers.vectorforce.command, process.execPath);
    assert.strictEqual(config.mcpServers?.vectorforce, undefined);

    assert.strictEqual(HarnessConfig.uninstallCopilot(fixture.workspacePath), true);
    const post = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(post.servers?.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

test('Compat: Kiro writes .kiro/settings/mcp.json and a steering file', () => {
  const fixture = createTestFixture();
  try {
    // Legacy path previous releases wrote (Kiro only reads .kiro/settings/mcp.json).
    const legacyDir = join(fixture.workspacePath, '.kiro');
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, 'mcp.json'), JSON.stringify({ mcpServers: { vectorforce: { command: 'node', args: ['old'] } } }), 'utf8');

    const installedPath = HarnessConfig.installKiro(fixture.workspacePath);
    assert.ok(installedPath.endsWith(join('.kiro', 'settings', 'mcp.json')));
    const config = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.ok(config.mcpServers.vectorforce);
    assert.strictEqual(config.mcpServers.vectorforce.command, process.execPath);
    assert.ok(existsSync(join(fixture.workspacePath, '.kiro', 'steering', 'vectorforce.md')));

    const legacy = JSON.parse(readFileSync(join(legacyDir, 'mcp.json'), 'utf8'));
    assert.strictEqual(legacy.mcpServers?.vectorforce, undefined);

    assert.strictEqual(HarnessConfig.uninstallKiro(fixture.workspacePath), true);
    const post = JSON.parse(readFileSync(installedPath, 'utf8'));
    assert.strictEqual(post.mcpServers?.vectorforce, undefined);
  } finally {
    fixture.cleanup();
  }
});

function createMcpClient(server) {
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();
  server.connect(clientToServer, serverToClient);
  let buffer = '';
  const queue = [];
  const waiters = [];
  serverToClient.setEncoding('utf8');
  serverToClient.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const parsed = JSON.parse(line);
      if (waiters.length > 0) waiters.shift()(parsed);
      else queue.push(parsed);
    }
  });
  return {
    send(req) {
      return new Promise((resolve) => {
        waiters.push(resolve);
        clientToServer.write(JSON.stringify(req) + '\n');
      });
    },
    async sendBatch(requests, expectedResponses) {
      clientToServer.write(JSON.stringify(requests) + '\n');
      const out = [];
      while (out.length < expectedResponses) {
        if (queue.length > 0) out.push(queue.shift());
        else out.push(await new Promise((resolve) => waiters.push(resolve)));
      }
      return out;
    }
  };
}

function mcpTestServer(fixture) {
  return new McpServer({
    store: fixture.store,
    projectService: fixture.projectService,
    checkpointService: fixture.checkpointService,
    briefingService: fixture.briefingService
  }, fixture.workspacePath);
}

test('Compat: initialize negotiates modern, legacy, and unknown protocol versions', async () => {
  const fixture = createTestFixture();
  try {
    const client = createMcpClient(mcpTestServer(fixture));
    const modern = await client.send({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-06-18', clientInfo: { name: 'compat', version: '0.0.0' } }
    });
    assert.strictEqual(modern.result.protocolVersion, '2025-06-18');
    assert.strictEqual(modern.result.serverInfo.name, 'vectorforce');
    assert.strictEqual(modern.result.serverInfo.version, MCP_SERVER_VERSION);
    assert.ok(modern.result.capabilities.tools);
    assert.ok(modern.result.capabilities.resources);
    assert.ok(modern.result.capabilities.prompts);

    const legacy = await client.send({
      jsonrpc: '2.0', id: 2, method: 'initialize',
      params: { protocolVersion: '2024-11-05', clientInfo: { name: 'compat', version: '0.0.0' } }
    });
    assert.strictEqual(legacy.result.protocolVersion, '2024-11-05');

    const unknown = await client.send({
      jsonrpc: '2.0', id: 3, method: 'initialize',
      params: { protocolVersion: '1999-01-01', clientInfo: { name: 'compat', version: '0.0.0' } }
    });
    assert.strictEqual(unknown.result.protocolVersion, MCP_PROTOCOL_VERSION);

    assert.ok(MCP_SUPPORTED_PROTOCOL_VERSIONS.includes('2024-11-05'));
    assert.strictEqual(negotiateProtocolVersion(undefined), MCP_PROTOCOL_VERSION);
  } finally {
    fixture.cleanup();
  }
});

test('Compat: resources and prompts discovery return empty collections', async () => {
  const fixture = createTestFixture();
  try {
    const client = createMcpClient(mcpTestServer(fixture));
    const resources = await client.send({ jsonrpc: '2.0', id: 11, method: 'resources/list' });
    assert.deepStrictEqual(resources.result, { resources: [] });
    const templates = await client.send({ jsonrpc: '2.0', id: 12, method: 'resources/templates/list' });
    assert.deepStrictEqual(templates.result, { resourceTemplates: [] });
    const prompts = await client.send({ jsonrpc: '2.0', id: 13, method: 'prompts/list' });
    assert.deepStrictEqual(prompts.result, { prompts: [] });
    const read = await client.send({ jsonrpc: '2.0', id: 14, method: 'resources/read', params: { uri: 'vf://nope' } });
    assert.strictEqual(read.error.code, -32602);
    const get = await client.send({ jsonrpc: '2.0', id: 15, method: 'prompts/get', params: { name: 'nope' } });
    assert.strictEqual(get.error.code, -32602);
  } finally {
    fixture.cleanup();
  }
});

test('Compat: batch requests receive one response per id and skip notifications', async () => {
  const fixture = createTestFixture();
  try {
    const client = createMcpClient(mcpTestServer(fixture));
    const responses = await client.sendBatch([
      { jsonrpc: '2.0', id: 21, method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 22, method: 'tools/list' }
    ], 2);
    assert.deepStrictEqual(responses.map((r) => r.id), [21, 22]);
    assert.ok(Array.isArray(responses[1].result.tools));
  } finally {
    fixture.cleanup();
  }
});

test('Compat: harness registry resolves aliases and detects markers', () => {
  const fixture = createTestFixture();
  try {
    assert.strictEqual(HarnessConfig.getSupportedHarnesses().length, 8);
    assert.strictEqual(HarnessConfig.resolveHarnessId('vscode'), 'copilot');
    assert.strictEqual(HarnessConfig.resolveHarnessId('github-copilot'), 'copilot');
    assert.strictEqual(HarnessConfig.resolveHarnessId('kiro-ide'), 'kiro');
    assert.strictEqual(HarnessConfig.resolveHarnessId('claude'), 'command-code');
    assert.strictEqual(HarnessConfig.resolveHarnessId('muse-code'), 'muse');
    assert.strictEqual(HarnessConfig.resolveHarnessId('cmd'), 'command-code');
    assert.strictEqual(HarnessConfig.resolveHarnessId('nope'), null);
    assert.strictEqual(HarnessConfig.resolveHarnessId(''), null);
    assert.strictEqual(HarnessConfig.installHarness(fixture.workspacePath, 'nope'), null);
    assert.strictEqual(HarnessConfig.uninstallHarness(fixture.workspacePath, 'nope'), false);

    assert.deepStrictEqual(HarnessConfig.detectHarnesses(fixture.workspacePath), []);
    mkdirSync(join(fixture.workspacePath, '.cursor'), { recursive: true });
    writeFileSync(join(fixture.workspacePath, '.cursorrules'), '# rules', 'utf8');
    mkdirSync(join(fixture.workspacePath, '.vscode'), { recursive: true });
    const detected = HarnessConfig.detectHarnesses(fixture.workspacePath).map((h) => h.id).sort();
    assert.deepStrictEqual(detected, ['copilot', 'cursor']);

    assert.strictEqual(HarnessConfig.isHarnessConfigured(fixture.workspacePath, 'cursor'), false);
    HarnessConfig.installHarness(fixture.workspacePath, 'cursor');
    assert.strictEqual(HarnessConfig.isHarnessConfigured(fixture.workspacePath, 'cursor'), true);
    assert.strictEqual(HarnessConfig.isHarnessConfigured(fixture.workspacePath, 'copilot'), false);
    assert.strictEqual(HarnessConfig.uninstallHarness(fixture.workspacePath, 'cursor'), true);
    assert.strictEqual(HarnessConfig.isHarnessConfigured(fixture.workspacePath, 'cursor'), false);
  } finally {
    fixture.cleanup();
  }
});

test('Compat: Muse global settings merge uses mcpServers and migrates snake_case', () => {
  const fresh = HarnessConfig._mergeMuseGlobalSettings({});
  assert.strictEqual(fresh.schema_version, 1);
  assert.strictEqual(fresh.mcpServers.vectorforce.transport, 'stdio');
  assert.strictEqual(fresh.mcpServers.vectorforce.mode, 'optional');
  assert.strictEqual(fresh.mcpServers.vectorforce.command, process.execPath);
  assert.ok(fresh.mcpServers.vectorforce.args.includes('mcp'));
  assert.strictEqual(fresh.mcp_servers, undefined);

  const legacy = HarnessConfig._mergeMuseGlobalSettings({
    schema_version: 1,
    mcp_servers: { vectorforce: { command: 'node', args: ['old'] } },
    other: 1
  });
  assert.ok(legacy.mcpServers.vectorforce);
  assert.strictEqual(legacy.mcpServers.vectorforce.command, process.execPath);
  assert.strictEqual(legacy.mcp_servers, undefined);
  assert.strictEqual(legacy.other, 1);

  const others = HarnessConfig._mergeMuseGlobalSettings({
    mcp_servers: { other: { command: 'x' } }
  });
  assert.ok(others.mcpServers.vectorforce);
  assert.deepStrictEqual(others.mcp_servers, { other: { command: 'x' } });
});

test('Compat: live server spawned from a generated config answers handshake and tools', async () => {
  const fixture = createTestFixture();
  let proc = null;
  try {
    fixture.projectService.initProject(fixture.workspacePath);
    fixture.projectService.createTask(fixture.workspacePath, 'spawn-task', 'Spawn Task');
    const entry = HarnessConfig.getCursorServerEntry();
    proc = spawn(entry.command, [...entry.args, '--workspace', fixture.workspacePath], {
      env: { ...process.env, VF_DB_PATH: fixture.dbPath, VF_WORKSPACE: fixture.workspacePath },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    proc.stderr.on('data', () => {});
    const responses = [];
    let buffer = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) responses.push(JSON.parse(line));
      }
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('MCP server did not start')), 15000);
      proc.on('spawn', () => { clearTimeout(timer); resolve(); });
      proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
    const waitForResponses = async (count) => {
      const deadline = Date.now() + 15000;
      while (responses.length < count && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.ok(responses.length >= count, 'timed out waiting for MCP responses');
    };
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', clientInfo: { name: 'compat-spawn', version: '0.0.0' } } }) + '\n');
    await waitForResponses(1);
    assert.strictEqual(responses[0].result.protocolVersion, '2025-06-18');
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_tasks', arguments: { status: 'active' } } }) + '\n');
    await waitForResponses(2);
    const tasks = JSON.parse(responses[1].result.content[0].text);
    assert.ok(tasks.tasks.some((t) => t.task_id === 'spawn-task'));
  } finally {
    if (proc && proc.exitCode === null) {
      proc.kill();
      await new Promise((resolve) => { proc.on('exit', resolve); setTimeout(resolve, 3000); });
    }
    fixture.cleanup();
  }
});
