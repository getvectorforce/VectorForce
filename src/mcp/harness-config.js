import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

export class HarnessConfig {
  /**
   * Get the absolute path to bin/vf.js
   */
  static getBinPath() {
    return resolve(new URL('../../bin/vf.js', import.meta.url).pathname);
  }

  /**
   * Generate configuration object for Antigravity.
   */
  static getAntigravityServerEntry() {
    return {
      command: 'node',
      args: [HarnessConfig.getBinPath(), 'mcp']
    };
  }

  /**
   * Preview changes to Antigravity configuration.
   * @param {string} workspacePath
   * @returns {{ filePath: string, exists: boolean, currentContent: object|null, mergedContent: object }}
   */
  static previewAntigravity(workspacePath) {
    const dir = join(workspacePath, '.agents');
    const filePath = join(dir, 'mcp_config.json');

    let current = null;
    if (existsSync(filePath)) {
      try {
        current = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch {
        current = {};
      }
    }

    const merged = {
      ...current,
      mcpServers: {
        ...(current?.mcpServers || {}),
        vectorforce: HarnessConfig.getAntigravityServerEntry()
      }
    };

    return {
      filePath,
      exists: existsSync(filePath),
      currentContent: current,
      mergedContent: merged
    };
  }

  /**
   * Install or update Antigravity MCP configuration reversibly.
   * @param {string} workspacePath
   * @returns {string} filePath
   */
  static installAntigravity(workspacePath) {
    const { filePath, mergedContent } = HarnessConfig.previewAntigravity(workspacePath);
    const dir = join(workspacePath, '.agents');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    writeFileSync(filePath, JSON.stringify(mergedContent, null, 2) + '\n', 'utf8');
    return filePath;
  }

  /**
   * Reversibly uninstall VectorForce from Antigravity configuration.
   * @param {string} workspacePath
   * @returns {boolean} whether removed
   */
  static uninstallAntigravity(workspacePath) {
    const filePath = join(workspacePath, '.agents', 'mcp_config.json');
    if (!existsSync(filePath)) return false;

    try {
      const config = JSON.parse(readFileSync(filePath, 'utf8'));
      if (config?.mcpServers?.vectorforce) {
        delete config.mcpServers.vectorforce;
        writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf8');
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Preview changes to Command Code configuration.
   * @param {string} workspacePath
   */
  /**
   * Generate configuration object for Command Code (.mcp.json).
   */
  static getCommandCodeServerEntry() {
    return {
      type: 'stdio',
      command: 'node',
      args: [HarnessConfig.getBinPath(), 'mcp']
    };
  }

  /**
   * Preview changes to Command Code configuration.
   * @param {string} workspacePath
   */
  static previewCommandCode(workspacePath) {
    const filePath = join(workspacePath, 'commandcode.json');
    const mcpJsonPath = join(workspacePath, '.mcp.json');
    let current = null;
    if (existsSync(filePath)) {
      try {
        current = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch {
        current = {};
      }
    }

    const merged = {
      ...current,
      mcpServers: {
        ...(current?.mcpServers || {}),
        vectorforce: HarnessConfig.getAntigravityServerEntry()
      }
    };

    let mcpCurrent = null;
    if (existsSync(mcpJsonPath)) {
      try {
        mcpCurrent = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
      } catch {
        mcpCurrent = {};
      }
    }

    const mcpMerged = {
      ...mcpCurrent,
      mcpServers: {
        ...(mcpCurrent?.mcpServers || {}),
        vectorforce: HarnessConfig.getCommandCodeServerEntry()
      }
    };

    const cliCommand = `cmd mcp add --transport stdio vectorforce -- node ${HarnessConfig.getBinPath()} mcp`;

    return {
      filePath,
      mcpJsonPath,
      exists: existsSync(filePath),
      cliCommand,
      currentContent: current,
      mergedContent: merged,
      mcpMerged
    };
  }

  /**
   * Install Command Code configuration reversibly.
   * Writes both .mcp.json (native Command Code v1.84.0 format) and commandcode.json.
   * @param {string} workspacePath
   */
  static installCommandCode(workspacePath) {
    const { filePath, mcpJsonPath, mergedContent, mcpMerged } = HarnessConfig.previewCommandCode(workspacePath);
    writeFileSync(filePath, JSON.stringify(mergedContent, null, 2) + '\n', 'utf8');
    writeFileSync(mcpJsonPath, JSON.stringify(mcpMerged, null, 2) + '\n', 'utf8');
    return filePath;
  }

  /**
   * Uninstall VectorForce from Command Code configuration.
   * @param {string} workspacePath
   */
  static uninstallCommandCode(workspacePath) {
    const filePath = join(workspacePath, 'commandcode.json');
    const mcpJsonPath = join(workspacePath, '.mcp.json');
    let removed = false;

    if (existsSync(filePath)) {
      try {
        const config = JSON.parse(readFileSync(filePath, 'utf8'));
        if (config?.mcpServers?.vectorforce) {
          delete config.mcpServers.vectorforce;
          writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf8');
          removed = true;
        }
      } catch {}
    }

    if (existsSync(mcpJsonPath)) {
      try {
        const mcpConfig = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
        if (mcpConfig?.mcpServers?.vectorforce) {
          delete mcpConfig.mcpServers.vectorforce;
          writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf8');
          removed = true;
        }
      } catch {}
    }

    return removed;
  }

  /**
   * Generate configuration object for Muse Code.
   */
  static getMuseCodeServerEntry() {
    return {
      command: 'node',
      args: [HarnessConfig.getBinPath(), 'mcp'],
      env: {
        VF_HARNESS: 'muse-code'
      }
    };
  }

  /**
   * Preview changes to Muse Code configuration.
   * @param {string} workspacePath
   */
  static previewMuseCode(workspacePath) {
    const dir = join(workspacePath, '.muse');
    const filePath = join(dir, 'mcp_config.json');
    const museJsonPath = join(workspacePath, 'musecode.json');

    let current = null;
    if (existsSync(filePath)) {
      try {
        current = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch {
        current = {};
      }
    }

    const merged = {
      ...current,
      mcpServers: {
        ...(current?.mcpServers || {}),
        vectorforce: HarnessConfig.getMuseCodeServerEntry()
      }
    };

    return {
      filePath,
      museJsonPath,
      exists: existsSync(filePath),
      currentContent: current,
      mergedContent: merged
    };
  }

  /**
   * Install Muse Code MCP configuration reversibly.
   * @param {string} workspacePath
   */
  static installMuseCode(workspacePath) {
    const { filePath, museJsonPath, mergedContent } = HarnessConfig.previewMuseCode(workspacePath);
    const dir = join(workspacePath, '.muse');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    writeFileSync(filePath, JSON.stringify(mergedContent, null, 2) + '\n', 'utf8');
    writeFileSync(museJsonPath, JSON.stringify(mergedContent, null, 2) + '\n', 'utf8');

    try {
      const globalMuseDir = join(homedir(), '.config', 'muse');
      const globalSettingsPath = join(globalMuseDir, 'settings.json');
      if (existsSync(globalSettingsPath)) {
        const settings = JSON.parse(readFileSync(globalSettingsPath, 'utf8'));
        settings.mcp_servers = {
          ...(settings.mcp_servers || {}),
          vectorforce: {
            transport: 'stdio',
            command: 'node',
            args: [HarnessConfig.getBinPath(), 'mcp'],
            env: {
              VF_HARNESS: 'muse-code',
              VF_WORKSPACE: workspacePath
            },
            mode: 'optional'
          }
        };
        delete settings.mcpServers;
        writeFileSync(globalSettingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
      }
    } catch {}

    return filePath;
  }

  /**
   * Uninstall VectorForce from Muse Code configuration reversibly.
   * @param {string} workspacePath
   */
  static uninstallMuseCode(workspacePath) {
    const filePath = join(workspacePath, '.muse', 'mcp_config.json');
    const museJsonPath = join(workspacePath, 'musecode.json');
    let removed = false;

    if (existsSync(filePath)) {
      try {
        const config = JSON.parse(readFileSync(filePath, 'utf8'));
        if (config?.mcpServers?.vectorforce) {
          delete config.mcpServers.vectorforce;
          writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf8');
          removed = true;
        }
      } catch {}
    }

    if (existsSync(museJsonPath)) {
      try {
        const config = JSON.parse(readFileSync(museJsonPath, 'utf8'));
        if (config?.mcpServers?.vectorforce) {
          delete config.mcpServers.vectorforce;
          writeFileSync(museJsonPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
          removed = true;
        }
      } catch {}
    }

    try {
      const globalSettingsPath = join(homedir(), '.config', 'muse', 'settings.json');
      if (existsSync(globalSettingsPath)) {
        const settings = JSON.parse(readFileSync(globalSettingsPath, 'utf8'));
        if (settings?.mcp_servers?.vectorforce) {
          delete settings.mcp_servers.vectorforce;
          writeFileSync(globalSettingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
        }
      }
    } catch {}

    return removed;
  }

  /**
   * Generate configuration object for Codex.
   */
  static getCodexServerEntry() {
    return {
      command: 'node',
      args: [HarnessConfig.getBinPath(), 'mcp'],
      env: {
        VF_HARNESS: 'codex'
      }
    };
  }

  /**
   * Format or merge TOML configuration for Codex MCP server.
   * @param {string} existingToml
   * @returns {string} merged TOML
   */
  static _mergeCodexToml(existingToml) {
    const binPath = HarnessConfig.getBinPath();
    const serverBlock = `[mcp_servers.vectorforce]\ncommand = "node"\nargs = ["${binPath}", "mcp"]\n[mcp_servers.vectorforce.env]\nVF_HARNESS = "codex"\n`;

    if (!existingToml || !existingToml.trim()) {
      return serverBlock;
    }

    const sectionRegex = /\[mcp_servers\.vectorforce\][\s\S]*?(?=(\n\[(?!mcp_servers\.vectorforce))|$)/;
    if (sectionRegex.test(existingToml)) {
      return existingToml.replace(sectionRegex, serverBlock.trimEnd()) + '\n';
    }

    return existingToml.trimEnd() + '\n\n' + serverBlock;
  }

  /**
   * Preview changes to Codex configuration.
   * @param {string} workspacePath
   */
  static previewCodex(workspacePath) {
    const dir = join(workspacePath, '.codex');
    const filePath = join(dir, 'config.toml');
    const codexJsonPath = join(workspacePath, 'codex.json');

    let currentToml = null;
    if (existsSync(filePath)) {
      try {
        currentToml = readFileSync(filePath, 'utf8');
      } catch {
        currentToml = null;
      }
    }

    let currentJson = null;
    if (existsSync(codexJsonPath)) {
      try {
        currentJson = JSON.parse(readFileSync(codexJsonPath, 'utf8'));
      } catch {
        currentJson = {};
      }
    }

    const mergedToml = HarnessConfig._mergeCodexToml(currentToml);
    const mergedJson = {
      ...currentJson,
      mcpServers: {
        ...(currentJson?.mcpServers || {}),
        vectorforce: HarnessConfig.getCodexServerEntry()
      }
    };

    const cliCommand = `codex mcp add vectorforce -- node ${HarnessConfig.getBinPath()} mcp`;

    return {
      filePath,
      codexJsonPath,
      exists: existsSync(filePath) || existsSync(codexJsonPath),
      cliCommand,
      currentContent: currentToml,
      mergedContent: mergedToml,
      mergedJson
    };
  }

  /**
   * Install Codex MCP configuration reversibly.
   * Writes both .codex/config.toml (standard Codex CLI) and codex.json.
   * @param {string} workspacePath
   * @returns {string} filePath
   */
  static installCodex(workspacePath) {
    const { filePath, codexJsonPath, mergedContent, mergedJson } = HarnessConfig.previewCodex(workspacePath);
    const dir = join(workspacePath, '.codex');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    writeFileSync(filePath, mergedContent, 'utf8');
    writeFileSync(codexJsonPath, JSON.stringify(mergedJson, null, 2) + '\n', 'utf8');

    try {
      const globalCodex = join(homedir(), '.codex');
      if (existsSync(globalCodex)) {
        const globalTomlPath = join(globalCodex, 'config.toml');
        const existingGlobal = existsSync(globalTomlPath) ? readFileSync(globalTomlPath, 'utf8') : '';
        const updatedGlobal = HarnessConfig._mergeCodexToml(existingGlobal);
        writeFileSync(globalTomlPath, updatedGlobal, 'utf8');
      }
    } catch {}

    return filePath;
  }

  /**
   * Uninstall VectorForce from Codex configuration reversibly.
   * @param {string} workspacePath
   * @returns {boolean} whether removed
   */
  static uninstallCodex(workspacePath) {
    const filePath = join(workspacePath, '.codex', 'config.toml');
    const codexJsonPath = join(workspacePath, 'codex.json');
    let removed = false;

    if (existsSync(filePath)) {
      try {
        const toml = readFileSync(filePath, 'utf8');
        const sectionRegex = /\[mcp_servers\.vectorforce\][\s\S]*?(?=(\n\[(?!mcp_servers\.vectorforce))|$)/;
        if (sectionRegex.test(toml)) {
          const cleaned = toml.replace(sectionRegex, '').trim();
          writeFileSync(filePath, cleaned ? cleaned + '\n' : '', 'utf8');
          removed = true;
        }
      } catch {}
    }

    if (existsSync(codexJsonPath)) {
      try {
        const config = JSON.parse(readFileSync(codexJsonPath, 'utf8'));
        if (config?.mcpServers?.vectorforce) {
          delete config.mcpServers.vectorforce;
          writeFileSync(codexJsonPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
          removed = true;
        }
      } catch {}
    }

    try {
      const globalTomlPath = join(homedir(), '.codex', 'config.toml');
      if (existsSync(globalTomlPath)) {
        const toml = readFileSync(globalTomlPath, 'utf8');
        const sectionRegex = /\[mcp_servers\.vectorforce\][\s\S]*?(?=(\n\[(?!mcp_servers\.vectorforce))|$)/;
        if (sectionRegex.test(toml)) {
          const cleaned = toml.replace(sectionRegex, '').trim();
          writeFileSync(globalTomlPath, cleaned ? cleaned + '\n' : '', 'utf8');
          removed = true;
        }
      }
    } catch {}

    return removed;
  }
}
