# Workspace Agents Directory (`.agents/agents/`)

This directory defines workspace-scoped agents for **VectorForce** (alongside the project-root [`AGENTS.md`](../../AGENTS.md)).

## Registered Workspace Agents

| Agent Name | File | Role & Responsibility |
| :--- | :--- | :--- |
| **`vectorforce-architect`** | [`vectorforce-architect.md`](vectorforce-architect.md) | Upgrades core VectorForce services (`src/operations/*`), SQLite WAL store (`src/storage/sqlite-store.js`), MCP tools (`src/mcp/mcp-server.js`), AI providers (`src/providers/llm-provider.js`), CLI (`bin/vf.js`), and Studio UI (`studio/`) while enforcing zero runtime dependencies. |
| **`vectorforce-samples-builder`** | [`vectorforce-samples-builder.md`](vectorforce-samples-builder.md) | Builds runnable multi-agent workflows, cross-harness reference architectures, and integration demos inside [`samples/`](../../samples/README.md). |
| **`vectorforce-auditor`** | [`vectorforce-auditor.md`](vectorforce-auditor.md) | Verifies security boundaries, allowlist limits (`AGENTS.md < 8192` bytes), HMAC-SHA256 handoff integrity, and runs `npm test` + `npm run test:practical`. |
