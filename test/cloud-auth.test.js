import test from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('VectorForce Cloud CLI Auth: login, whoami, and logout', () => {
  const tempHome = mkdtempSync(join(tmpdir(), 'vf-home-test-'));
  const tempWs = mkdtempSync(join(tmpdir(), 'vf-ws-test-'));
  const vfBin = join(process.cwd(), 'bin', 'vf.js');

  const env = {
    ...process.env,
    HOME: tempHome,
    VF_WORKSPACE: tempWs,
    VF_CLOUD_URL: 'https://omprakash-pce2011--vectorforce-cloud-vectorforce-cloud-web.modal.run'
  };

  const runVf = (args) => {
    return execFileSync(process.execPath, [vfBin, ...args], {
      cwd: tempWs,
      env,
      encoding: 'utf8'
    });
  };

  try {
    // 1. Check initial whoami
    const initialWhoami = runVf(['whoami']);
    assert.ok(initialWhoami.includes('VectorForce Cloud Active Session:'));
    assert.ok(initialWhoami.includes('Cloud Endpoint:'));

    // 2. Perform vf login with test subscription key
    const testKey = 'vf_live_sub_98a7bc65f012e4d9';
    const loginOut = runVf(['login', testKey, '--project', 'proj-meta-e2ee']);
    assert.ok(loginOut.includes('Logged in to VectorForce Cloud!'));
    assert.ok(loginOut.includes('proj-meta-e2ee'));

    // Verify global config file was written
    const globalCfg = join(tempHome, '.vectorforce', 'config.json');
    assert.ok(existsSync(globalCfg), 'Global config file should exist');
    const parsedGlobal = JSON.parse(readFileSync(globalCfg, 'utf8'));
    assert.strictEqual(parsedGlobal.subscriptionKey, testKey);
    assert.strictEqual(parsedGlobal.remoteProjectId, 'proj-meta-e2ee');

    // 3. Check whoami returns active session
    const postLoginWhoami = runVf(['whoami']);
    assert.ok(postLoginWhoami.includes('Subscription Key: vf_live_sub_'));
    assert.ok(postLoginWhoami.includes('Default Project:  proj-meta-e2ee'));

    // 4. Test temporary CI/CD token generation
    const tokenCreateOut = runVf(['token', 'create', '--ttl', '12']);
    assert.ok(tokenCreateOut.includes('Generated Temporary Enterprise CI/CD Token:'));
    assert.ok(tokenCreateOut.includes('vf_temp_ci_'));
    const tempTokenMatch = tokenCreateOut.match(/(vf_temp_ci_[a-z0-9_]+)/i);
    assert.ok(tempTokenMatch, 'Should find generated temp token');
    const tempToken = tempTokenMatch[1];

    // 5. Authenticate in CI mode with the temporary token
    const ciLoginOut = runVf(['login', '--token', tempToken, '--ci']);
    assert.ok(ciLoginOut.includes('CI/CD Headless'));
    assert.ok(ciLoginOut.includes('Temporary CI/CD Token'));

    // Verify whoami reflects temporary token
    const tempWhoami = runVf(['whoami']);
    assert.ok(tempWhoami.includes('Temporary Enterprise Token (CI/CD)'));

    // 6. Perform vf logout
    const logoutOut = runVf(['logout']);
    assert.ok(logoutOut.includes('Logged out from VectorForce Cloud'));

    // Verify key was removed
    const afterLogoutCfg = JSON.parse(readFileSync(globalCfg, 'utf8'));
    assert.strictEqual(afterLogoutCfg.subscriptionKey, undefined);
  } finally {
    try { rmSync(tempHome, { recursive: true, force: true }); } catch {}
    try { rmSync(tempWs, { recursive: true, force: true }); } catch {}
  }
});

