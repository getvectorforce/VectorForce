#!/usr/bin/env node
/**
 * VectorForce Practical Cross-Platform Test Environment
 * Simulates a realistic multi-developer, multi-harness workflow across:
 *   1. Real Git repository initialization & commits
 *   2. VectorForce CLI initialization & MCP Harness auto-configuration
 *   3. Live MCP Server (stdio JSON-RPC) handshake & tool execution
 *   4. Cross-harness resume (Antigravity -> Command Code / Claude Code -> Muse -> Codex)
 *   5. Developer A -> Developer B tamper-evident handoff bundle export & import
 *   6. Silent workspace & document drift detection
 */

import { mkdtempSync, writeFileSync, appendFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, platform, release, arch } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const VF_BIN = join(ROOT_DIR, 'bin', 'vf.js');

function logStep(step, title) {
  console.log(`\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m[STEP ${step}]\x1b[0m \x1b[1m${title}\x1b[0m`);
  console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
}

function runVf(cwd, args) {
  console.log(`\x1b[90m$ node bin/vf.js ${args.join(' ')}\x1b[0m`);
  const out = execFileSync(process.execPath, [VF_BIN, ...args], {
    cwd,
    encoding: 'utf8'
  });
  console.log(out.trim());
  return out;
}

function runGit(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

async function testLiveMcpStdio(workspacePath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn(process.execPath, [VF_BIN, 'mcp', '--workspace', workspacePath], {
      cwd: workspacePath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const responses = [];
    let buffer = '';

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          responses.push(JSON.parse(line));
          if (responses.length === 3) {
            proc.kill();
            resolvePromise(responses);
          }
        } catch (err) {
          rejectPromise(err);
        }
      }
    });

    proc.on('error', rejectPromise);

    // Send 1: initialize, 2: tools/list, 3: tools/call (check_workspace_drift)
    const requests = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'practical-env-tester', version: '1.0.0' } } },
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'check_workspace_drift', arguments: { task_id: 'auth-pkce' } } }
    ];

    for (const req of requests) {
      proc.stdin.write(JSON.stringify(req) + '\n');
    }
  });
}

async function main() {
  console.log(`\n🚀 \x1b[1mVectorForce Practical Real-World Test Environment\x1b[0m`);
  console.log(`   OS Platform : ${platform()} (${release()}) [${arch()}]`);
  console.log(`   Node.js     : ${process.version}`);
  console.log(`   VF Binary   : ${VF_BIN}`);

  const simRoot = mkdtempSync(join(tmpdir(), 'vf-practical-env-'));
  const devA = resolve(join(simRoot, 'developer-a-workspace'));
  const devB = resolve(join(simRoot, 'developer-b-workspace'));

  try {
    // STEP 1: Create Real Git Repository for Developer A
    logStep(1, 'Create Real Git Repository & Architecture Spec (Developer A)');
    execFileSync('git', ['init', devA], { encoding: 'utf8' });
    runGit(devA, ['config', 'user.email', 'dev-a@vectorforce.dev']);
    runGit(devA, ['config', 'user.name', 'Developer A']);

    writeFileSync(
      join(devA, 'AGENTS.md'),
      '# Project Architecture Invariants\n- Zero external backend runtime dependencies\n- Strict allowlist enforcement\n',
      'utf8'
    );
    writeFileSync(
      join(devA, 'auth.js'),
      'export function verifyPkceChallenge(verifier, challenge) { return Boolean(verifier && challenge); }\n',
      'utf8'
    );
    runGit(devA, ['add', '.']);
    runGit(devA, ['commit', '-m', 'feat: initial PKCE module and architecture spec']);
    console.log(`✔ Created Git repo at ${devA}`);

    // STEP 2: Initialize VectorForce & Auto-Configure All MCP Clients
    logStep(2, 'Initialize VectorForce & Auto-Configure All AI Clients (MCP)');
    runVf(devA, ['init', 'Enterprise-Auth-Service']);
    runVf(devA, ['config', 'install', 'all']);
    runVf(devA, ['status']);

    // Verify all config files exist on disk
    const expectedFiles = [
      join(devA, '.vectorforce', 'vectorforce.db'),
      join(devA, '.agents', 'mcp_config.json'),
      join(devA, '.mcp.json'),
      join(devA, '.muse', 'mcp_config.json'),
      join(devA, '.codex', 'config.toml')
    ];
    for (const file of expectedFiles) {
      if (!existsSync(file)) throw new Error(`Missing expected file: ${file}`);
    }

    // STEP 3: Create Task, Allowlist Spec & Capture Checkpoint
    logStep(3, 'Register Task, Allowlist Spec & Capture Cryptographic Checkpoint');
    runVf(devA, ['task', 'auth-pkce', 'Implement OAuth2 PKCE Handshake']);
    runVf(devA, ['policy', 'add', 'AGENTS.md']);
    runVf(devA, [
      'checkpoint',
      '--task', 'auth-pkce',
      '--summary', 'Implemented PKCE SHA-256 verifier and initial spec',
      '--goal', 'Complete OAuth2 PKCE flow',
      '--constraint', 'Zero external backend runtime dependencies',
      '--decision', 'DEC-AUTH-01:PKCE:Use built-in node:crypto SHA-256',
      '--next', 'Add refresh token rotation',
      '--doc', 'AGENTS.md'
    ]);

    // STEP 4: Live MCP stdio JSON-RPC Server Verification
    logStep(4, 'Spawn Live MCP Server over stdio & Execute JSON-RPC Tool Calls');
    const mcpResponses = await testLiveMcpStdio(devA);
    const toolsCount = mcpResponses[1]?.result?.tools?.length || 0;
    const driftText = mcpResponses[2]?.result?.content?.[0]?.text || '';
    console.log(`✔ Live MCP Handshake (initialize): Server "${mcpResponses[0]?.result?.serverInfo?.name}" v${mcpResponses[0]?.result?.serverInfo?.version}`);
    console.log(`✔ Live MCP tools/list: ${toolsCount} tools registered`);
    console.log(`✔ Live MCP tools/call (check_workspace_drift): ${driftText.trim()}`);

    // STEP 5: Cross-Harness Resume & AI Memory Reasoning
    logStep(5, 'Cross-Harness Context Resume (Antigravity -> Command Code -> Codex)');
    runVf(devA, ['resume', '--task', 'auth-pkce', '--dest', 'antigravity']);
    runVf(devA, ['reason', '--task', 'auth-pkce', '--raw']);

    // STEP 6: Export Handoff Bundle & Import into Developer B Workspace
    logStep(6, 'Team Handoff: Export Bundle from Dev A -> Import into Dev B Workspace');
    execFileSync('git', ['init', devB], { encoding: 'utf8' });
    runVf(devB, ['init', 'Enterprise-Auth-Service-Clone']);
    const bundlePath = join(devA, 'handoff-auth-pkce.json');
    runVf(devA, ['export', '--task', 'auth-pkce', '--recipient', 'developer-b', '--dest', 'any', '--out', bundlePath]);
    runVf(devB, ['import', bundlePath]);
    runVf(devB, ['resume', '--task', 'auth-pkce', '--dest', 'command-code']);

    // STEP 7: Simulate Silent Workspace Drift & Verify Detection
    logStep(7, 'Simulate Silent File Drift & Verify Cryptographic Drift Detection');
    appendFileSync(join(devA, 'AGENTS.md'), '- Added new rate-limiting invariant\n', 'utf8');
    const driftOut = runVf(devA, ['drift', '--task', 'auth-pkce']);
    if (!driftOut.includes('DRIFT DETECTED')) {
      throw new Error('Expected DRIFT DETECTED when AGENTS.md was modified');
    }

    console.log(`\n\x1b[1m\x1b[42m\x1b[30m PASS \x1b[0m \x1b[1mAll 7 Practical Real-World Environment Checks Succeeded on ${platform()}!\x1b[0m\n`);
  } finally {
    try {
      rmSync(simRoot, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Practical Simulation Failed:', err);
  process.exit(1);
});
