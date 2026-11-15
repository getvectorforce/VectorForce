import test from 'node:test';
import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

test('VectorForce Cloud CLI Auth: login, whoami, and logout', async () => {
  const tempHome = mkdtempSync(join(tmpdir(), 'vf-home-test-'));
  const tempWs = mkdtempSync(join(tmpdir(), 'vf-ws-test-'));
  const vfBin = join(process.cwd(), 'bin', 'vf.js');

  const validTokens = new Set(['vf_live_sub_98a7bc65f012e4d9']);
  const mockCloud = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const authHeader = req.headers.authorization || '';
    const subKeyHeader = req.headers['x-subscription-key'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || String(subKeyHeader).trim();
    res.setHeader('Content-Type', 'application/json');

    if (!validTokens.has(token) && !token.startsWith('vf_temp_ci_')) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (url.pathname === '/api/cloud/overview') {
      res.writeHead(200);
      res.end(JSON.stringify({
        organization: { name: 'VectorForce Cloud Hub', subscription_tier: 'Enterprise' },
        activeProject: { project_id: url.searchParams.get('projectId') || 'proj-meta-e2ee' }
      }));
      return;
    }

    if (url.pathname === '/api/cloud/auth/temp-token' && req.method === 'POST') {
      const tempToken = 'vf_temp_ci_mock_1234567890abcdef';
      validTokens.add(tempToken);
      res.writeHead(201);
      res.end(JSON.stringify({
        token: tempToken,
        expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        scope: 'write'
      }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  await new Promise((resolve) => mockCloud.listen(0, '127.0.0.1', resolve));
  const mockPort = mockCloud.address().port;

  const env = {
    ...process.env,
    HOME: tempHome,
    VF_WORKSPACE: tempWs,
    VF_CLOUD_URL: `http://127.0.0.1:${mockPort}`
  };

  const runVf = async (args) => {
    const { stdout } = await execFileAsync(process.execPath, [vfBin, ...args], {
      cwd: tempWs,
      env,
      encoding: 'utf8'
    });
    return stdout;
  };

  try {
    // 1. Check initial whoami
    const initialWhoami = await runVf(['whoami']);
    assert.ok(initialWhoami.includes('VectorForce Cloud Active Session:'));
    assert.ok(initialWhoami.includes('Cloud Endpoint:'));

    // 2. Perform vf login with test subscription key
    const testKey = 'vf_live_sub_98a7bc65f012e4d9';
    const loginOut = await runVf(['login', testKey, '--url', `http://127.0.0.1:${mockPort}`, '--project', 'proj-meta-e2ee']);
    assert.ok(loginOut.includes('Logged in to VectorForce Cloud!'));
    assert.ok(loginOut.includes('proj-meta-e2ee'));

    // Verify global config file was written
    const globalCfg = join(tempHome, '.vectorforce', 'config.json');
    assert.ok(existsSync(globalCfg), 'Global config file should exist');
    const parsedGlobal = JSON.parse(readFileSync(globalCfg, 'utf8'));
    assert.strictEqual(parsedGlobal.subscriptionKey, testKey);
    assert.strictEqual(parsedGlobal.remoteProjectId, 'proj-meta-e2ee');

    // 3. Check whoami returns active session
    const postLoginWhoami = await runVf(['whoami']);
    assert.ok(postLoginWhoami.includes('Subscription Key: vf_live_sub_'));
    assert.ok(postLoginWhoami.includes('Default Project:  proj-meta-e2ee'));

    // 4. Test temporary CI/CD token generation
    const tokenCreateOut = await runVf(['token', 'create', '--ttl', '12']);
    assert.ok(tokenCreateOut.includes('Generated Temporary Enterprise CI/CD Token:'));
    assert.ok(tokenCreateOut.includes('vf_temp_ci_'));
    const tempTokenMatch = tokenCreateOut.match(/(vf_temp_ci_[a-z0-9_]+)/i);
    assert.ok(tempTokenMatch, 'Should find generated temp token');
    const tempToken = tempTokenMatch[1];

    // 5. Authenticate in CI mode with the temporary token
    const ciLoginOut = await runVf(['login', '--token', tempToken, '--url', `http://127.0.0.1:${mockPort}`, '--ci']);
    assert.ok(ciLoginOut.includes('CI/CD Headless'));
    assert.ok(ciLoginOut.includes('Temporary CI/CD Token'));

    // Verify whoami reflects temporary token
    const tempWhoami = await runVf(['whoami']);
    assert.ok(tempWhoami.includes('Temporary Enterprise Token (CI/CD)'));

    // 6. Perform vf logout
    const logoutOut = await runVf(['logout']);
    assert.ok(logoutOut.includes('Logged out from VectorForce Cloud'));

    // Verify key was removed
    const afterLogoutCfg = JSON.parse(readFileSync(globalCfg, 'utf8'));
    assert.strictEqual(afterLogoutCfg.subscriptionKey, undefined);
  } finally {
    mockCloud.closeAllConnections?.();
    await new Promise((resolve) => mockCloud.close(resolve));
    try { rmSync(tempHome, { recursive: true, force: true }); } catch {}
    try { rmSync(tempWs, { recursive: true, force: true }); } catch {}
  }
});

