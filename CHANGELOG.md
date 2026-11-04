# Changelog

All notable changes to the `vectorforce` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.8] - 2026-11-04

### Added
- Dynamic project semantic topology layout and AST import dependency edge mapping in Studio `/api/graph`.
- Live workspace AST entity symbols extraction and allowlisted document evidence collection (SHA-256 digests and file sizes) in `/api/memory`.
- Task scope selector and live Git branch/commit/dirty badges in the Studio header.

### Fixed
- Studio Project Graph and Memory views now dynamically reflect the active workspace repository rather than fallback mock structures.
- Dashboard metric cards (Health Score, AI Reasoning, Ontology & Memory, Provenance Chain) and recent checkpoint cards are now interactive and route to their respective views (`timeline`, `settings`, `memory`, `graph`).

## [0.3.4] - 2026-11-04

### Fixed
- Cross-platform MCP availability: generated harness configs now use the absolute Node.js runtime (`process.execPath`) with `"type": "stdio"` instead of bare `node`, so GUI-launched clients on Windows, macOS, and Linux can spawn `vf mcp` even when `node` is not on their PATH.
- MCP protocol compatibility: the stdio server negotiates `protocolVersion` (`2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`), reports the package version, answers `resources/list`, `resources/templates/list`, `prompts/list`, and JSON-RPC batches, and keeps `stdout` reserved for JSON-RPC in `vf mcp` mode.
- VS Code / Copilot: `.vscode/mcp.json` is now written under the top-level `servers` key (the only shape VS Code reads); legacy `mcpServers.vectorforce` entries are migrated on install and removed on uninstall.
- Kiro IDE: workspace config is now written to `.kiro/settings/mcp.json` (the path Kiro reads) with steering in `.kiro/steering/vectorforce.md`; the legacy `.kiro/mcp.json` entry is migrated.
- Meta Muse: `installMuseCode` now always ensures the global `~/.config/muse/settings.json` entry under the `mcpServers` key (the block Muse Code actually reads; a stale `mcp_servers.vectorforce` entry is migrated) with no workspace pin so one entry serves every project, and no longer deletes unrelated user keys.
- Antigravity: global config prefers `~/.gemini/config/mcp_config.json` with fallback to `~/.gemini/antigravity/mcp_config.json`.
- Codex TOML now embeds quoted absolute paths for both the Node runtime and `bin/vf.js`.

### Changed
- `vf init` no longer creates every harness config at once: it auto-detects harnesses already in use (marker files/dirs), installs only those, and otherwise creates none while printing the exact follow-up commands. Override with `vf init --harness <id[,...]|all|none>` or `vf init --all`.
- Added `vf config list` showing supported harnesses with detected/configured status; `vf config install`/`uninstall` reject unknown harness names with that hint.
- `vf doctor`, `vf status`, and `vf config doctor` now verify the VectorForce entry exists instead of only the file.

## [0.3.2] - 2026-11-01

### Added
- **First-Class Support for 4 Additional AI Harnesses**:
  - **Cursor IDE**: Added automated configuration for `.cursor/mcp.json` and `.cursorrules` in `HarnessConfig.installCursor`.
  - **Windsurf (Codeium Cascade)**: Added automated configuration for `.windsurf/mcp_config.json` and `.windsurfrules` in `HarnessConfig.installWindsurf`.
  - **GitHub Copilot / VS Code**: Added automated workspace configuration for `.vscode/mcp.json` and `.github/copilot-instructions.md` in `HarnessConfig.installCopilot`.
  - **Kiro IDE**: Added automated configuration for `.kiro/mcp.json`, `kiro.json`, and `.kiro/rules.md` in `HarnessConfig.installKiro`.
- **Harness Policy & Tool Schema Expansion**:
  - Updated `APPROVED_DESTINATIONS` in `Authorizer` to approve `cursor`, `windsurf`, `github-copilot`, `copilot`, `kiro`, and `kiro-ide`.
  - Updated MCP tool schemas for `get_resume_briefing`, `export_handoff`, `get_timeline`, and `reason_about_task` to accept all newly supported harnesses.
- **Universal MCP Configuration Guide in Documentation**:
  - Added dedicated installation instructions to `README.md` for Cline / Roo Code, Zed Editor, JetBrains IDEs (IntelliJ, WebStorm, PyCharm), Sourcegraph Cody, Aider, and generic stdio MCP clients.
- **Comprehensive Unit & Security Test Coverage**:
  - Added automated reversible install/uninstall tests for Cursor, Windsurf, GitHub Copilot, and Kiro IDE (test suite expanded to 79 tests).

### Changed
- `vf init`, `vf config install all`, `vf config doctor`, and `vf status` now inspect and provision all 9 AI coding harnesses.
- Pruned `package.json` package `files` whitelist to strictly include runtime artifacts (`bin/`, `src/`, `studio/dist/`, `CHANGELOG.md`, `LICENSE`, `README.md`).

---

## [0.2.0] - 2026-10-31

### Added
- **Unified Remote Sync Commands (`vf remote`, `vf push`, `vf pull`)**:
  - `vf remote set <URL> [--key <KEY>] [--project <ID>]`: Configure remote cloud synchronization endpoint in `.vectorforce/config.json`.
  - `vf push`: Read local `.vectorforce/vectorforce.db`, wrap tasks & checkpoints in End-to-End Encrypted (E2EE) envelopes (`AES-256-GCM` + `X25519` + `Ed25519`), and push to VectorForce Cloud / Modal.com.
  - `vf pull`: Pull the latest encrypted envelope from the cloud, verify the `Ed25519` digital signature, decrypt via `X25519` + `AES-256-GCM`, reconcile into local SQLite, and synthesize the **Meta Muse (`muse-spark-open`)** reasoning briefing.
- **VectorForce Cloud & Modal.com Serverless Deployment**:
  - Dedicated cloud sync server supporting multi-project registries, B2B2B sub-customer tenant isolation, and developer task assignment boards.
  - One-command deployment to Modal.com (`modal_app.py`) with persistent `modal.Volume` storage for encrypted SQLite WAL databases.
- **Interactive Team Handoff & Studio UI Upgrades**:
  - Added direct browser download of `.vfhandoff.json` bundle files.
  - Added interactive in-browser **Import & Reconcile Teammate Handoff Package** modal (`POST /api/handoff/import`) with SHA-256 manifest validation.
  - Automatic resolution of active tasks and divergent checkpoint heads in Studio export endpoints.
- **Automated npm Lifecycle Hooks**:
  - Added `prepublishOnly` script in `package.json` to ensure `npm --prefix studio run build` and all 75 tests run automatically before every `npm publish`.

### Changed
- **CLI Commands Simplified**: Unified remote cloud sync under the standard `vf` command (following the `git remote`, `git push`, `git pull` mental model).
- **Workspace Agent Protocols**: Upgraded workspace-level `AGENTS.md` and role definitions for `vectorforce-architect`, `vectorforce-auditor`, and `vectorforce-samples-builder`.

### Fixed
- Fixed `TypeError` in `TeamHandoffView.jsx` when resolving checkpoints with differing `id` vs `checkpoint_id` shapes.
- Fixed divergent leaf head resolution in `/api/handoff/export` by auto-selecting the latest timestamped checkpoint.
- Fixed ephemeral key generation in serverless environments by persisting machine identities in durable SQLite storage.

---

## [0.1.0] - 2026-10-27

### Added
- Initial public release of VectorForce — "Git for AI Context".
- Zero-dependency local SQLite WAL persistence engine (`node:sqlite`).
- Model Context Protocol (MCP) server over JSON-RPC 2.0 stdio with 9 core tools (`save_checkpoint`, `get_resume_briefing`, `check_workspace_drift`, `reason_about_task`, `list_tasks`, `set_document_policy`, `export_handoff`, `import_handoff`, `get_timeline`).
- Automatic multi-harness configuration generators for Google Antigravity, Claude Code, Command Code, Meta Muse, and OpenAI Codex.
- Multi-provider AI reasoning engine supporting Meta Muse (`muse-spark-1.3`, `muse-spark-open`), Fireworks AI, OpenRouter, Local Ollama, OpenAI, Anthropic, and custom BYOK endpoints.
- Local VectorForce Studio Web UI (`vf studio`) on port 3210 with interactive SVG architecture dependency and blast-radius graph.
