import test from 'node:test';
import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import { createTestFixture } from './helpers/fixtures.js';
import { McpServer, MCP_PROTOCOL_VERSION } from '../src/mcp/mcp-server.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

function createHarnessMcpConnection(server) {
  const inStream = new PassThrough();
  const outStream = new PassThrough();

  server.connect(inStream, outStream);

  let buffer = '';
  const waiters = [];

  outStream.setEncoding('utf8');
  outStream.on('data', (chunk) => {
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
        }
      }
    }
  });

  return {
    async callTool(name, args) {
      return new Promise((resolve) => {
        waiters.push((res) => {
          resolve(res.result);
        });
        const req = {
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1000000),
          method: 'tools/call',
          params: { name, arguments: args }
        };
        inStream.write(JSON.stringify(req) + '\n');
      });
    }
  };
}

test('Milestone M2: Bidirectional Antigravity <-> Command Code task handover', async () => {
  const fixture = createTestFixture();
  try {
    // Initialize project
    const project = fixture.projectService.initProject(fixture.workspacePath, 'M2-Handover-Evaluation');
    fixture.projectService.createTask(fixture.workspacePath, 'task-auth-service', 'Implement Auth Service');

    // Create allowlisted spec document
    fixture.createFile('docs/auth-spec.md', '# Auth Specification\n- RS256 JWT tokens\n- Clock skew <= 60s\n');
    fixture.store.setDocumentPolicy(project.project_id, ['docs/auth-spec.md']);

    // Initialize MCP server instances representing the two independent harness processes
    const antigravityServer = new McpServer({
      store: fixture.store,
      projectService: fixture.projectService,
      checkpointService: fixture.checkpointService,
      briefingService: fixture.briefingService
    }, fixture.workspacePath);

    const commandCodeServer = new McpServer({
      store: fixture.store,
      projectService: fixture.projectService,
      checkpointService: fixture.checkpointService,
      briefingService: fixture.briefingService
    }, fixture.workspacePath);

    // =========================================================================
    // STEP 1: Antigravity Session Captures Task Architecture Checkpoint
    // =========================================================================
    const antigravity = createHarnessMcpConnection(antigravityServer);

    const step1Result = await antigravity.callTool('save_checkpoint', {
      task_id: 'task-auth-service',
      summary: 'Architectural planning for Auth Service completed in Antigravity',
      goals: ['Implement token validator', 'Enforce 60s clock skew tolerance'],
      constraints: ['Zero external network calls during validation', 'Clock skew tolerance <= 60s'],
      decisions: [
        {
          id: 'DEC-JWT-01',
          title: 'RS256 JWT Verification',
          rationale: 'Asymmetric keys prevent signing key disclosure'
        }
      ],
      next_steps: ['Switch to Command Code terminal to run token benchmarks', 'Implement validator core'],
      requested_documents: ['docs/auth-spec.md'],
      include_git: false
    });

    assert.strictEqual(step1Result.isError, false);
    const step1Receipt = JSON.parse(step1Result.content[0].text);
    assert.strictEqual(step1Receipt.status, 'committed');
    const checkpoint1Id = step1Receipt.reference_id;
    assert.ok(checkpoint1Id);

    // =========================================================================
    // STEP 2: Command Code Terminal Session Resumes the Task
    // =========================================================================
    const commandCode = createHarnessMcpConnection(commandCodeServer);

    // Verify workspace drift before proceeding
    const drift1 = await commandCode.callTool('check_workspace_drift', {
      task_id: 'task-auth-service'
    });
    const driftSummary1 = JSON.parse(drift1.content[0].text);
    assert.strictEqual(driftSummary1.drift_detected, false);
    assert.strictEqual(driftSummary1.warnings.length, 0);

    // Retrieve resume briefing for Command Code
    const resume1 = await commandCode.callTool('get_resume_briefing', {
      task_id: 'task-auth-service',
      destination_harness: 'command-code'
    });

    assert.strictEqual(resume1.isError, false);
    const briefingText1 = resume1.content[0].text;

    // Verify 100% meaning and constraint preservation
    assert.ok(briefingText1.includes('# Task Briefing: Implement Auth Service (`task-auth-service`)'));
    assert.ok(briefingText1.includes('⚠️ Zero external network calls during validation'));
    assert.ok(briefingText1.includes('⚠️ Clock skew tolerance <= 60s'));
    assert.ok(briefingText1.includes('DEC-JWT-01: RS256 JWT Verification'));
    assert.ok(briefingText1.includes('Switch to Command Code terminal to run token benchmarks'));
    assert.ok(briefingText1.includes('docs/auth-spec.md'));
    assert.ok(briefingText1.includes('RS256 JWT tokens'));

    // =========================================================================
    // STEP 3: Command Code Completes Work and Saves Checkpoint #2
    // =========================================================================
    const step2Result = await commandCode.callTool('save_checkpoint', {
      task_id: 'task-auth-service',
      summary: 'Token validator benchmarks completed in Command Code terminal',
      goals: ['Token validator benchmarks passing under 2ms'],
      constraints: ['Clock skew tolerance <= 60s'],
      decisions: [
        {
          id: 'DEC-JWT-02',
          title: 'In-memory LRU key cache',
          rationale: 'Cache verified JWKS public keys for 1 hour'
        }
      ],
      next_steps: ['Return to Antigravity IDE for UI / error handling integration'],
      requested_documents: ['docs/auth-spec.md'],
      include_git: false
    });

    assert.strictEqual(step2Result.isError, false);
    const step2Receipt = JSON.parse(step2Result.content[0].text);
    assert.strictEqual(step2Receipt.status, 'committed');
    const checkpoint2Id = step2Receipt.reference_id;

    // Verify parent linkage in store
    const cp2 = fixture.store.getCheckpoint(checkpoint2Id);
    assert.strictEqual(cp2.parent_id, checkpoint1Id);

    // =========================================================================
    // STEP 4: Antigravity IDE Resumes From Command Code Checkpoint
    // =========================================================================
    const resume2 = await antigravity.callTool('get_resume_briefing', {
      task_id: 'task-auth-service',
      destination_harness: 'antigravity'
    });

    assert.strictEqual(resume2.isError, false);
    const briefingText2 = resume2.content[0].text;

    // Verify updated context
    assert.ok(briefingText2.includes(`**Checkpoint ID:** \`${checkpoint2Id}\``));
    assert.ok(briefingText2.includes('Token validator benchmarks completed in Command Code terminal'));
    assert.ok(briefingText2.includes('DEC-JWT-02: In-memory LRU key cache'));
    assert.ok(briefingText2.includes('Return to Antigravity IDE for UI / error handling integration'));

    // =========================================================================
    // STEP 5: Evidence Drift Detection on Modified Specification
    // =========================================================================
    // Modify spec document on disk
    const specPath = join(fixture.workspacePath, 'docs/auth-spec.md');
    writeFileSync(specPath, '# Auth Specification\n- RS256 JWT tokens\n- CHANGED CLOCK SKEW TO 30s\n', 'utf8');

    const drift2 = await antigravity.callTool('check_workspace_drift', {
      task_id: 'task-auth-service'
    });
    const driftSummary2 = JSON.parse(drift2.content[0].text);
    assert.strictEqual(driftSummary2.drift_detected, true);
    assert.ok(driftSummary2.warnings.some(w => w.includes('content has changed')));
  } finally {
    fixture.cleanup();
  }
});
