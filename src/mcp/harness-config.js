import { join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync, mkdirSync, realpathSync } from 'node:fs';

function isTempWorkspace(workspacePath) {
  if (process.env.VF_NO_GLOBAL_CONFIG === '1' || process.env.NODE_TEST_CONTEXT) return true;
  try {
    const realWs = realpathSync(workspacePath);
    const realTmp = realpathSync(tmpdir());
    return realWs.startsWith(realTmp);
  } catch {
    return workspacePath.startsWith(tmpdir()) || workspacePath.includes('vf-test-') || workspacePath.includes('vf-practical-');
  }
}

export class HarnessConfig {
  /**
   * Get the absolute path to bin/vf.js (cross-platform: macOS, Linux, Windows)
   */
  static getBinPath() {
    return fileURLToPath(new URL('../../bin/vf.js', import.meta.url));
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

    if (!isTempWorkspace(workspacePath)) {
      try {
        const globalAgyDir = join(homedir(), '.gemini', 'antigravity');
        if (existsSync(globalAgyDir)) {
          const globalMcpPath = join(globalAgyDir, 'mcp_config.json');
          let globalConfig = {};
          if (existsSync(globalMcpPath)) {
            try {
              globalConfig = JSON.parse(readFileSync(globalMcpPath, 'utf8'));
            } catch {
              globalConfig = {};
            }
          }
          globalConfig.mcpServers = {
            ...(globalConfig.mcpServers || {}),
            vectorforce: {
              command: 'node',
              args: [HarnessConfig.getBinPath(), 'mcp', '--workspace', workspacePath],
              env: {
                VF_WORKSPACE: workspacePath,
                VF_DB_PATH: join(workspacePath, '.vectorforce', 'vectorforce.db')
              }
            }
          };
          writeFileSync(globalMcpPath, JSON.stringify(globalConfig, null, 2) + '\n', 'utf8');
        }
      } catch {}
    }

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

    if (!isTempWorkspace(workspacePath)) {
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
    }

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

    if (!isTempWorkspace(workspacePath)) {
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
    }

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
    const binPath = HarnessConfig.getBinPath().replace(/\\/g, '\\\\');
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

    if (!isTempWorkspace(workspacePath)) {
      try {
        const globalCodex = join(homedir(), '.codex');
        if (existsSync(globalCodex)) {
          const globalTomlPath = join(globalCodex, 'config.toml');
          const existingGlobal = existsSync(globalTomlPath) ? readFileSync(globalTomlPath, 'utf8') : '';
          const updatedGlobal = HarnessConfig._mergeCodexToml(existingGlobal);
          writeFileSync(globalTomlPath, updatedGlobal, 'utf8');
        }
      } catch {}
    }

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

  // ==========================================
  // Cursor IDE Integration
  // ==========================================

  /**
   * Generate configuration object for Cursor (.cursor/mcp.json).
   */
  static getCursorServerEntry() {
    return {
      command: 'node',
      args: [HarnessConfig.getBinPath(), 'mcp'],
      env: {
        VF_HARNESS: 'cursor'
      }
    };
  }

  /**
   * Preview changes to Cursor configuration.
   * @param {string} workspacePath
   */
  static previewCursor(workspacePath) {
    const dir = join(workspacePath, '.cursor');
    const filePath = join(dir, 'mcp.json');
    let current = null;
    if (existsSync(filePath)) {
      try {
        current = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch {
        current = {};
      }
    }
    const mergedContent = {
      ...(current || {}),
      mcpServers: {
        ...(current?.mcpServers || {}),
        vectorforce: HarnessConfig.getCursorServerEntry()
      }
    };
    return {
      filePath,
      exists: existsSync(filePath),
      currentContent: current,
      mergedContent
    };
  }

  /**
   * Install Cursor MCP configuration and rules reversibly.
   * @param {string} workspacePath
   * @returns {string} filePath
   */
  static installCursor(workspacePath) {
    const { filePath, mergedContent } = HarnessConfig.previewCursor(workspacePath);
    const dir = join(workspacePath, '.cursor');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    writeFileSync(filePath, JSON.stringify(mergedContent, null, 2) + '\n', 'utf8');

    // Create .cursorrules if missing
    const cursorRulesPath = join(workspacePath, '.cursorrules');
    if (!existsSync(cursorRulesPath)) {
      writeFileSync(
        cursorRulesPath,
        `# VectorForce Agent Protocol (Cursor)\n\nThis workspace uses VectorForce for architectural continuity and drift verification.\n- Check active tasks & drift: Use MCP tools 'list_tasks' & 'check_workspace_drift'\n- Retrieve briefing: Use MCP tool 'get_resume_briefing'\n- Save checkpoint: Use MCP tool 'save_checkpoint'\n`,
        'utf8'
      );
    }

    if (!isTempWorkspace(workspacePath)) {
      try {
        const globalCursorDir = join(homedir(), '.cursor');
        if (existsSync(globalCursorDir)) {
          const globalMcpPath = join(globalCursorDir, 'mcp.json');
          let globalConfig = {};
          if (existsSync(globalMcpPath)) {
            try {
              globalConfig = JSON.parse(readFileSync(globalMcpPath, 'utf8'));
            } catch {
              globalConfig = {};
            }
          }
          globalConfig.mcpServers = {
            ...(globalConfig.mcpServers || {}),
            vectorforce: {
              command: 'node',
              args: [HarnessConfig.getBinPath(), 'mcp', '--workspace', workspacePath],
              env: {
                VF_WORKSPACE: workspacePath,
                VF_HARNESS: 'cursor'
              }
            }
          };
          writeFileSync(globalMcpPath, JSON.stringify(globalConfig, null, 2) + '\n', 'utf8');
        }
      } catch {}
    }

    return filePath;
  }

  /**
   * Reversibly uninstall VectorForce from Cursor configuration.
   * @param {string} workspacePath
   * @returns {boolean} whether removed
   */
  static uninstallCursor(workspacePath) {
    const filePath = join(workspacePath, '.cursor', 'mcp.json');
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
    return removed;
  }

  // ==========================================
  // Windsurf Cascade Integration
  // ==========================================

  /**
   * Generate configuration object for Windsurf (.windsurf/mcp_config.json).
   */
  static getWindsurfServerEntry() {
    return {
      command: 'node',
      args: [HarnessConfig.getBinPath(), 'mcp'],
      env: {
        VF_HARNESS: 'windsurf'
      }
    };
  }

  /**
   * Preview changes to Windsurf configuration.
   * @param {string} workspacePath
   */
  static previewWindsurf(workspacePath) {
    const dir = join(workspacePath, '.windsurf');
    const filePath = join(dir, 'mcp_config.json');
    let current = null;
    if (existsSync(filePath)) {
      try {
        current = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch {
        current = {};
      }
    }
    const mergedContent = {
      ...(current || {}),
      mcpServers: {
        ...(current?.mcpServers || {}),
        vectorforce: HarnessConfig.getWindsurfServerEntry()
      }
    };
    return {
      filePath,
      exists: existsSync(filePath),
      currentContent: current,
      mergedContent
    };
  }

  /**
   * Install Windsurf MCP configuration and rules reversibly.
   * @param {string} workspacePath
   * @returns {string} filePath
   */
  static installWindsurf(workspacePath) {
    const { filePath, mergedContent } = HarnessConfig.previewWindsurf(workspacePath);
    const dir = join(workspacePath, '.windsurf');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    writeFileSync(filePath, JSON.stringify(mergedContent, null, 2) + '\n', 'utf8');

    // Create .windsurfrules if missing
    const windsurfRulesPath = join(workspacePath, '.windsurfrules');
    if (!existsSync(windsurfRulesPath)) {
      writeFileSync(
        windsurfRulesPath,
        `# VectorForce Agent Protocol (Windsurf Cascade)\n\nThis workspace uses VectorForce for architectural continuity and drift verification.\n- Check tasks & drift: Call MCP tools 'list_tasks' and 'check_workspace_drift'\n- Resume briefing: Call MCP tool 'get_resume_briefing'\n- Save checkpoint: Call MCP tool 'save_checkpoint'\n`,
        'utf8'
      );
    }

    if (!isTempWorkspace(workspacePath)) {
      try {
        const globalWindsurfDir = join(homedir(), '.codeium', 'windsurf');
        if (existsSync(globalWindsurfDir)) {
          const globalMcpPath = join(globalWindsurfDir, 'mcp_config.json');
          let globalConfig = {};
          if (existsSync(globalMcpPath)) {
            try {
              globalConfig = JSON.parse(readFileSync(globalMcpPath, 'utf8'));
            } catch {
              globalConfig = {};
            }
          }
          globalConfig.mcpServers = {
            ...(globalConfig.mcpServers || {}),
            vectorforce: {
              command: 'node',
              args: [HarnessConfig.getBinPath(), 'mcp', '--workspace', workspacePath],
              env: {
                VF_WORKSPACE: workspacePath,
                VF_HARNESS: 'windsurf'
              }
            }
          };
          writeFileSync(globalMcpPath, JSON.stringify(globalConfig, null, 2) + '\n', 'utf8');
        }
      } catch {}
    }

    return filePath;
  }

  /**
   * Reversibly uninstall VectorForce from Windsurf configuration.
   * @param {string} workspacePath
   * @returns {boolean} whether removed
   */
  static uninstallWindsurf(workspacePath) {
    const filePath = join(workspacePath, '.windsurf', 'mcp_config.json');
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
    return removed;
  }

  // ==========================================
  // GitHub Copilot & VS Code Integration
  // ==========================================

  /**
   * Generate configuration object for VS Code / GitHub Copilot (.vscode/mcp.json).
   */
  static getCopilotServerEntry() {
    return {
      command: 'node',
      args: [HarnessConfig.getBinPath(), 'mcp'],
      env: {
        VF_HARNESS: 'copilot'
      }
    };
  }

  /**
   * Preview changes to Copilot / VS Code configuration.
   * @param {string} workspacePath
   */
  static previewCopilot(workspacePath) {
    const dir = join(workspacePath, '.vscode');
    const filePath = join(dir, 'mcp.json');
    let current = null;
    if (existsSync(filePath)) {
      try {
        current = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch {
        current = {};
      }
    }
    const mergedContent = {
      ...(current || {}),
      mcpServers: {
        ...(current?.mcpServers || {}),
        vectorforce: HarnessConfig.getCopilotServerEntry()
      }
    };
    return {
      filePath,
      exists: existsSync(filePath),
      currentContent: current,
      mergedContent
    };
  }

  /**
   * Install GitHub Copilot workspace instructions & VS Code MCP configuration.
   * @param {string} workspacePath
   * @returns {string} filePath
   */
  static installCopilot(workspacePath) {
    const { filePath, mergedContent } = HarnessConfig.previewCopilot(workspacePath);
    const vscodeDir = join(workspacePath, '.vscode');
    if (!existsSync(vscodeDir)) {
      mkdirSync(vscodeDir, { recursive: true, mode: 0o755 });
    }
    writeFileSync(filePath, JSON.stringify(mergedContent, null, 2) + '\n', 'utf8');

    // Create .github/copilot-instructions.md if missing
    const githubDir = join(workspacePath, '.github');
    if (!existsSync(githubDir)) {
      mkdirSync(githubDir, { recursive: true, mode: 0o755 });
    }
    const copilotMdPath = join(githubDir, 'copilot-instructions.md');
    if (!existsSync(copilotMdPath)) {
      writeFileSync(
        copilotMdPath,
        `# VectorForce Context Protocol (GitHub Copilot)\n\nThis workspace uses VectorForce for architectural continuity and drift protection.\n- Architectural decisions (ADRs) and invariant constraints are tracked in VectorForce.\n- Check tasks and drift via VectorForce MCP or \`node bin/vf.js drift\`.\n- Always capture progress with \`node bin/vf.js checkpoint\`.\n`,
        'utf8'
      );
    }

    return filePath;
  }

  /**
   * Reversibly uninstall VectorForce from Copilot / VS Code configuration.
   * @param {string} workspacePath
   * @returns {boolean} whether removed
   */
  static uninstallCopilot(workspacePath) {
    const filePath = join(workspacePath, '.vscode', 'mcp.json');
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
    return removed;
  }

  // ==========================================
  // Kiro IDE Integration
  // ==========================================

  /**
   * Generate configuration object for Kiro IDE (.kiro/mcp.json).
   */
  static getKiroServerEntry() {
    return {
      command: 'node',
      args: [HarnessConfig.getBinPath(), 'mcp'],
      env: {
        VF_HARNESS: 'kiro'
      }
    };
  }

  /**
   * Preview changes to Kiro IDE configuration.
   * @param {string} workspacePath
   */
  static previewKiro(workspacePath) {
    const dir = join(workspacePath, '.kiro');
    const filePath = join(dir, 'mcp.json');
    const kiroJsonPath = join(workspacePath, 'kiro.json');

    let current = null;
    if (existsSync(filePath)) {
      try {
        current = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch {
        current = {};
      }
    }
    const mergedContent = {
      ...(current || {}),
      mcpServers: {
        ...(current?.mcpServers || {}),
        vectorforce: HarnessConfig.getKiroServerEntry()
      }
    };

    let currentKiroJson = null;
    if (existsSync(kiroJsonPath)) {
      try {
        currentKiroJson = JSON.parse(readFileSync(kiroJsonPath, 'utf8'));
      } catch {
        currentKiroJson = {};
      }
    }
    const mergedKiroJson = {
      ...(currentKiroJson || {}),
      mcpServers: {
        ...(currentKiroJson?.mcpServers || {}),
        vectorforce: HarnessConfig.getKiroServerEntry()
      }
    };

    return {
      filePath,
      kiroJsonPath,
      exists: existsSync(filePath) || existsSync(kiroJsonPath),
      currentContent: current,
      mergedContent,
      mergedKiroJson
    };
  }

  /**
   * Install Kiro IDE MCP configuration and rules reversibly.
   * @param {string} workspacePath
   * @returns {string} filePath
   */
  static installKiro(workspacePath) {
    const { filePath, kiroJsonPath, mergedContent, mergedKiroJson } = HarnessConfig.previewKiro(workspacePath);
    const dir = join(workspacePath, '.kiro');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    writeFileSync(filePath, JSON.stringify(mergedContent, null, 2) + '\n', 'utf8');
    writeFileSync(kiroJsonPath, JSON.stringify(mergedKiroJson, null, 2) + '\n', 'utf8');

    // Create .kiro/rules.md if missing
    const rulesPath = join(dir, 'rules.md');
    if (!existsSync(rulesPath)) {
      writeFileSync(
        rulesPath,
        `# VectorForce Agent Steering (Kiro IDE)\n\nThis workspace uses VectorForce for architectural continuity and drift prevention.\n- Use VectorForce MCP tools: 'list_tasks', 'check_workspace_drift', 'get_resume_briefing', 'save_checkpoint'.\n- Strictly adhere to invariant constraints and architectural decisions.\n`,
        'utf8'
      );
    }

    return filePath;
  }

  /**
   * Reversibly uninstall VectorForce from Kiro IDE configuration.
   * @param {string} workspacePath
   * @returns {boolean} whether removed
   */
  static uninstallKiro(workspacePath) {
    const filePath = join(workspacePath, '.kiro', 'mcp.json');
    const kiroJsonPath = join(workspacePath, 'kiro.json');
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

    if (existsSync(kiroJsonPath)) {
      try {
        const config = JSON.parse(readFileSync(kiroJsonPath, 'utf8'));
        if (config?.mcpServers?.vectorforce) {
          delete config.mcpServers.vectorforce;
          writeFileSync(kiroJsonPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
          removed = true;
        }
      } catch {}
    }

    return removed;
  }
}
