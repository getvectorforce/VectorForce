# Changelog

All notable changes to the `vectorforce` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
