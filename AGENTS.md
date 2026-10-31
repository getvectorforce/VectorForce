# VectorForce Workspace Architecture & Agent Continuity Guide (`AGENTS.md`)

This repository is the core workspace for **VectorForce** — a local-first, zero-dependency, privacy-preserving engineering context platform ("Git for AI Context") across **Google Antigravity**, **Meta Muse**, **Claude Code**, **Command Code**, and **OpenAI Codex**.

---

## 1. Context Protocol Workflow (Mandatory for All AI Agents)

### At the Start of a Task / Resuming Work:
1. **Discover active tasks:**
   - MCP: `list_tasks({ status: "active" })` | CLI: `node bin/vf.js tasks active`
2. **Check for workspace or document drift:**
   - MCP: `check_workspace_drift({ task_id: "<task_id>" })` | CLI: `node bin/vf.js drift --task <task_id>`
3. **Retrieve the authorized briefing:**
   - MCP: `get_resume_briefing({ task_id: "<task_id>", destination_harness: "antigravity" })` (`"antigravity" | "muse-code" | "command-code" | "codex"`)
   - CLI: `node bin/vf.js resume --task <task_id> --dest antigravity`
4. **Reason over the context (AI memory):**
   - MCP: `reason_about_task({ task_id: "<task_id>" })` | CLI: `node bin/vf.js reason --task <task_id>`
5. **Adhere to Invariant Constraints:** Respect all rules under `# Invariant Constraints` in the briefing.

### At the End of a Task Phase / Before Switching Harnesses:
1. **Capture an immutable checkpoint:**
   - MCP: `save_checkpoint({ task_id, summary, goals, constraints, decisions, next_steps, requested_documents })`
   - CLI:
     ```bash
     node bin/vf.js checkpoint --task <id> --summary "<summary>" \
       --goal "<goal>" --constraint "<constraint>" \
       --decision "<ID>:<Title>:<Rationale>" \
       --next "<next_step>" --doc "AGENTS.md"
     ```
2. **Verify Receipt:** Ensure the operation receipt returns `status: "committed"`.

---

## 2. Security & Policy Invariants

- **Zero External Runtime Dependencies:** Core CLI, MCP server, and Studio backend use **only** Node.js built-ins (`node:sqlite`, `node:http`, `node:crypto`, `node:fs`, `node:child_process`).
- **Claims vs Evidence Distinction:** Human/model inputs (`goals`, `constraints`, `decisions`, `next_steps`) are stored as unverifiable **`claims`**. Git commit SHAs, dirty states, and SHA-256 document digests are recorded as verifiable **`evidence`**.
- **Strict Document Allowlist & Size Cap:** Only `.md`/`.txt` files in `node bin/vf.js policy list` (max `8 KiB` per file, `64 KiB` total) may be collected. `AGENTS.md` must stay `< 8192` bytes. Symlinks and path traversal (`..`) are strictly rejected.
- **Safe Receipts:** Receipts and audit logs never contain raw document bodies or API credentials.

---

## 3. Workspace Directory & Module Map

```text
VectorForce/
├── AGENTS.md                      # Workspace guide & agent protocol (< 8 KiB)
├── README.md                      # Public documentation & quickstart
├── package.json                   # Zero-dependency ESM package (Node >= 22.5.0)
├── bin/vf.js                      # Unified CLI (init, status, checkpoint, resume, reason, studio, mcp, handoff, config)
├── src/
│   ├── index.js                   # Public programmatic SDK exports
│   ├── core/                      # errors.js, hash.js (SHA-256 / HMAC), types.js (schema validators)
│   ├── policy/authorizer.js       # Workspace containment, symlink rejection, allowlist & harness auth
│   ├── storage/sqlite-store.js    # Local SQLite WAL engine (.vectorforce/vectorforce.db)
│   ├── providers/
│   │   ├── code-index-provider.js # Zero-dep AST/symbol & dependency graph indexer
│   │   ├── document-provider.js   # Policy-enforced doc reader & SHA-256 evidence collector
│   │   ├── git-provider.js        # Git branch, HEAD SHA, dirty status, and file diff observer
│   │   └── llm-provider.js        # AI adapter (Fireworks, Muse, OpenRouter, Ollama, OpenAI, Anthropic, BYOK)
│   ├── operations/
│   │   ├── project-service.js     # Project & task lifecycle + allowlist management
│   │   ├── checkpoint-service.js  # Immutable checkpoint creation + evidence collection
│   │   ├── briefing-service.js    # Cross-harness resume briefing + live Git/doc drift reconciliation
│   │   ├── reasoning-service.js   # AI reasoning synthesis over checkpoints + code index + drift
│   │   └── handoff-service.js     # HMAC-SHA256 signed handoff export/import + lineage verification
│   ├── mcp/
│   │   ├── mcp-server.js          # JSON-RPC 2.0 stdio MCP server exposing 9 tools + 3 resources
│   │   └── harness-config.js      # Auto-generator for Antigravity, Claude, Command Code, Muse, Codex configs
│   └── studio/server.js           # Local HTTP server (127.0.0.1:3210) + REST API for VectorForce Studio
├── studio/                        # React + Vite + Tailwind + XYFlow frontend for VectorForce Studio
├── samples/                       # Runnable sample architectures, multi-agent workflows & integrations
├── scripts/practical-test-env.js  # 7-stage cross-OS practical E2E simulation (Git + CLI + MCP + Handoff)
├── test/                          # 75 automated unit, security, MCP, and cross-harness tests
└── wiki/                          # Local-only ADRs (001-014) and phase planning (gitignored)
```

### Generated Harness Configs in Workspace Root (`vf init`):
- `.mcp.json`, `.commandcode/mcp.json`, `commandcode.json` — Claude Code & Command Code
- `.agents/mcp_config.json`, `~/.gemini/antigravity/mcp_config.json` — Google Antigravity
- `.muse/mcp_config.json`, `musecode.json` — Meta Muse
- `.codex/config.toml`, `codex.json` — OpenAI Codex CLI

---

## 4. MCP Tools & AI Provider Reference

| MCP Tool (`src/mcp/mcp-server.js`) | Service Method | Purpose |
| :--- | :--- | :--- |
| `list_tasks` | `ProjectService.listTasks` | Discover active/completed tasks |
| `save_checkpoint` | `CheckpointService.saveCheckpoint` | Commit claims + Git/doc evidence to SQLite |
| `get_resume_briefing` | `BriefingService.generateBriefing` | Deterministic cross-harness briefing |
| `check_workspace_drift` | `BriefingService.checkWorkspaceDrift` | Compare live Git & doc hashes vs checkpoint |
| `reason_about_task` | `ReasoningService.reasonAboutTask` | AI architectural briefing + risk analysis |
| `set_document_policy` | `ProjectService.setDocumentPolicy` | Update workspace document allowlist |
| `export_handoff` | `HandoffService.exportHandoff` | Export HMAC-SHA256 signed `.vfhandoff.json` |
| `import_handoff` | `HandoffService.importHandoff` | Verify signature/hashes & import handoff |
| `get_timeline` | `SqliteStore.getAuditEvents` | Inspect chronological audit trail |

### Supported AI Reasoning Providers (`src/providers/llm-provider.js`):
1. **Fireworks AI (`Muse Spark Open`)**: `vf config fireworks <KEY>` (`accounts/fireworks/models/muse-spark-open`)
2. **Meta Muse Direct**: `vf config muse <KEY>` (`muse-spark-1.3`)
3. **OpenRouter (`Muse Spark Open`)**: `vf config openrouter <KEY> --model meta/muse-spark-open`
4. **Local Ollama**: `vf config ollama --model llama3.3` (`http://127.0.0.1:11434`)
5. **OpenAI / Anthropic / BYOK**: `vf config openai <KEY>` | `vf config anthropic <KEY>` | `vf config byok <URL> <KEY> --model <ID>`

---

## 5. Extension Playbook (Samples & Production Upgrades)

1. **Adding Samples (`samples/`)**: Place runnable workflows, reference architectures, and multi-agent demos inside `samples/` using `src/index.js` or CLI/MCP bridges.
2. **Adding/Upgrading MCP Tools**: Add business logic in `src/operations/*`, persistence in `src/storage/sqlite-store.js`, MCP registration in `src/mcp/mcp-server.js`, SDK export in `src/index.js`, and CLI command in `bin/vf.js`.
3. **Upgrading Studio UI**: Add REST routes in `src/studio/server.js` and React views in `studio/src/components/`, then build via `npm --prefix studio run build`.
4. **Verification Gate**: Always run `npm test` (75 unit/security tests) and `npm run test:practical` (7-stage E2E test) before committing.
