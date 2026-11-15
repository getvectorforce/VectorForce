# VectorForce Workspace Architecture & Agent Continuity Guide (`AGENTS.md`)

This repository is the core workspace for **VectorForce** — a local-first, zero-dependency engineering context platform ("Git for AI Context") across **Google Antigravity**, **Meta Muse**, **Claude Code**, **Command Code**, **OpenAI Codex**, **Cursor**, **Windsurf**, **GitHub Copilot**, and **Kiro IDE**.

---

## 1. Context Protocol Workflow (Mandatory for All AI Agents)

### At the Start of a Task / Resuming Work:
1. **Discover active tasks:**
   - MCP: `list_tasks({ status: "active" })` | CLI: `node bin/vf.js tasks active`
2. **Check for workspace or document drift:**
   - MCP: `check_workspace_drift({ task_id: "<task_id>" })` | CLI: `node bin/vf.js drift --task <task_id>`
3. **Retrieve the authorized briefing:**
   - MCP: `get_resume_briefing({ task_id: "<task_id>", destination_harness: "<harness>" })`
   - CLI: `node bin/vf.js resume --task <task_id> --dest <harness>`
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
- **Strict Tool Boundary & Guardrails:** AI agents must **never** inspect, search, or edit `node_modules/vectorforce`, `bin/vf.js`, or package files. Operate strictly via MCP tools (`create_task`, `list_tasks`, `save_checkpoint`).
- **Claims vs Evidence Distinction:** Model inputs (`goals`, `constraints`, `decisions`, `next_steps`) are stored as unverifiable **`claims`**. Git commit SHAs, dirty states, and SHA-256 document digests are verifiable **`evidence`**.
- **Strict Document Allowlist & Size Cap:** Only `.md`/`.txt` files in `policy list` (max `8 KiB` per file, `64 KiB` total) may be collected. `AGENTS.md` must stay `< 8192` bytes. Symlinks and path traversal (`..`) are strictly rejected.
- **Safe Receipts:** Receipts and audit logs never contain raw document bodies or API credentials.

---

## 3. Workspace Directory Map

```text
VectorForce/
├── AGENTS.md                      # Workspace guide & agent protocol (< 8 KiB)
├── README.md                      # Public documentation & quickstart
├── package.json                   # Zero-dependency ESM package (Node >= 22.5.0)
├── bin/vf.js                      # Unified CLI (task, checkpoint, resume, reason, login)
├── src/
│   ├── index.js                   # SDK exports
│   ├── core/                      # errors.js, hash.js, types.js
│   ├── policy/authorizer.js       # Workspace containment & allowlist auth
│   ├── storage/sqlite-store.js    # Local SQLite WAL engine (.vectorforce/vectorforce.db)
│   ├── providers/                 # code-index, document, git, and llm-provider
│   ├── operations/                # project, checkpoint, briefing, reasoning, handoff
│   ├── mcp/                       # JSON-RPC MCP server (11 tools) & harness-config
│   └── studio/server.js           # Studio HTTP server (127.0.0.1:3210) & REST API
├── studio/                        # React + Vite + Tailwind + XYFlow frontend
├── samples/                       # Multi-agent workflows & samples
├── scripts/practical-test-env.js  # 7-stage practical E2E test
├── test/                          # Unit, security, and MCP tests
└── wiki/                          # Local-only ADRs and planning
```

### Harness Configs (`vf init` / `vf config install`):
- `.mcp.json`, `commandcode.json` — Claude Code & Command Code
- `.agents/mcp_config.json` — Google Antigravity
- `.muse/mcp_config.json`, `musecode.json` — Meta Muse
- `.codex/config.toml`, `codex.json` — OpenAI Codex CLI
- `.cursor/mcp.json`, `.cursorrules` — Cursor IDE
- `.windsurf/mcp_config.json`, `.windsurfrules` — Windsurf Cascade
- `.vscode/mcp.json` (`servers`) — GitHub Copilot
- `.kiro/settings/mcp.json`, `kiro.json` — Kiro IDE

---

## 4. MCP Tools & AI Provider Reference

| MCP Tool (`src/mcp/mcp-server.js`) | Service Method | Purpose |
| :--- | :--- | :--- |
| `create_task` | `ProjectService.createTask` | Create task or subtask (`parent_task_id`) |
| `update_task` | `ProjectService.updateTaskStatus` | Update status (`active`/`completed`/`abandoned`) |
| `list_tasks` | `ProjectService.listTasks` | Discover active/completed tasks & subtasks |
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
4. **Verification Gate**: Always run `npm test` and `npm run test:practical` before committing.
