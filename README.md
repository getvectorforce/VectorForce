# VectorForce (VF)

> **Git for AI Context** — A local-first, privacy-preserving engineering memory platform and architecture control center for AI coding agents.

[![Tests](https://img.shields.io/badge/tests-65%20passing-brightgreen.svg)](#test-suite)
[![Dependencies](https://img.shields.io/badge/backend%20runtime%20deps-zero-blue.svg)](#architecture-invariants)
[![Storage](https://img.shields.io/badge/storage-local%20SQLite%20WAL-orange.svg)](#local-first-architecture)
[![Harnesses](https://img.shields.io/badge/harnesses-Antigravity%20%7C%20Command%20Code%20%7C%20Codex%20%7C%20Muse-purple.svg)](#harness-integrations)
[![Hackathon](https://img.shields.io/badge/Meta%20Muse%20Hackathon-2026-blueviolet.svg)](#meta-muse-hackathon)

---

## The Problem: Coding Agent Amnesia

Every autonomous coding agent today (Google Antigravity, Command Code, Claude Engineer, etc.) operates in isolated ephemeral sessions. When an agent closes its context window:
1. **Architectural Decisions vanish**: Rationale, API boundaries, and non-negotiable constraints are forgotten.
2. **Silent Drift goes unnoticed**: Files and documents change without verifying against prior invariant contracts.
3. **No Cross-Harness Continuity**: A task started in Antigravity cannot cleanly resume in Command Code or be handed off to a teammate without losing the intent.

## The Solution: VectorForce

VectorForce provides an immutable, cryptographic context layer that tracks:
- **Verifiable Evidence**: Git commit SHAs, file SHA-256 hashes, and workspace drift.
- **Model Claims**: Explicit goals, constraints, architectural decisions (ADRs), and next steps.
- **AI Engineering Memory**: Meta Llama / Muse reasoning layer that synthesizes where you left off, what changed, architectural risks, and ranked next actions.

---

## VectorForce Studio (Web UI)

VectorForce includes a local-first engineering control center:

```bash
# Launch VectorForce Studio (opens on port 3210 by default)
node bin/vf.js studio
```

### Studio Features
- **Project Health & Metrics**: Live health score based on active drift, task completion, and checkpoint currency.
- **Interactive Architecture Graph**: Interactive SVG topology mapping module dependencies across security, storage, reasoning, code index, and harness bridges. Click any node to inspect blast radius, governing ADRs, and active drift.
- **AI Workspace Console**: Real-time prompt console powered by Meta Llama / Muse models with strict Claims vs Evidence visual fencing.
- **Repository Memory & Timeline**: Search indexed symbols, view allowlisted documents, inspect decisions, and generate weekly context continuity recaps.
- **Team Handoff Preview**: Secure, selective context sharing without leaking private secrets or un-allowlisted documents.

---

## Quickstart

### 1. Initialize a Project
```bash
node bin/vf.js init
```

### 2. Create and Select a Task
```bash
node bin/vf.js task auth-module "Implement PKCE OAuth Authentication"
```

### 3. Check for Workspace Drift
```bash
node bin/vf.js drift --task auth-module
```

### 4. Commit an Immutable Checkpoint
```bash
node bin/vf.js checkpoint --task auth-module \
  --summary "Completed PKCE OAuth handshake and token validation" \
  --goal "Ship secure OAuth flow" \
  --constraint "Zero external auth libraries" \
  --decision "DEC-AUTH-01:PKCE:Use SHA-256 code challenge with local storage" \
  --next "Implement refresh token rotation" \
  --doc "AGENTS.md"
```

### 5. Reason Over Context (AI Engineering Memory)
```bash
# Uses local Ollama by default, or cloud providers (Meta Muse, OpenRouter, OpenAI Codex)
# With Meta Muse (Responses API at api.meta.ai):
node bin/vf.js config muse <API_KEY>
node bin/vf.js reason --task auth-module

# With OpenRouter + DeepSeek v4.1 Flash:
export OPENROUTER_API_KEY="sk-or-v1-..."
node bin/vf.js reason --task auth-module

# Or specify model explicitly:
node bin/vf.js reason --task auth-module --model deepseek/deepseek-v4.1-flash-1017

# Degrades deterministically if no LLM provider is configured
node bin/vf.js reason --task auth-module --no-llm
```

---

## Model Context Protocol (MCP)

VectorForce exposes a standard stdio JSON-RPC MCP server for direct integration into **Google Antigravity**, **Command Code**, **Meta Muse**, and **OpenAI Codex**:

### JSON Configuration (Antigravity, Command Code, Muse)
```json
{
  "mcpServers": {
    "vectorforce": {
      "command": "node",
      "args": ["/absolute/path/to/VectorForce/bin/vf.js", "mcp"]
    }
  }
}
```

### TOML Configuration (OpenAI Codex CLI: `.codex/config.toml`)
```toml
[mcp_servers.vectorforce]
command = "node"
args = ["/absolute/path/to/VectorForce/bin/vf.js", "mcp"]
[mcp_servers.vectorforce.env]
VF_HARNESS = "codex"
```

### Automated Configuration
```bash
# Auto-configure for a specific harness:
node bin/vf.js config install codex
node bin/vf.js config install antigravity
node bin/vf.js config install command-code

# Or install for all supported harnesses at once:
node bin/vf.js config install all
```

### Available MCP Tools
| Tool | Purpose |
|---|---|
| `save_checkpoint` | Commit an immutable context checkpoint with Git and document evidence |
| `get_resume_briefing` | Retrieve authorized task briefing with invariant constraints and drift analysis |
| `check_workspace_drift` | Compare working tree commit and allowlisted file hashes against checkpoint |
| `reason_about_task` | Llama-powered AI continuation narrative and architectural risk assessment |
| `list_tasks` | Discover and filter active, archived, or all tasks |
| `set_document_policy` | Manage project allowlist for verifiable document evidence |
| `export_handoff` | Create an encrypted, tamper-evident handoff bundle for teammates or other harnesses |
| `import_handoff` | Safely verify and import a handoff bundle into destination workspace |
| `get_timeline` | Generate weekly chronological context continuity recap |

---

## Architecture Invariants

- **Zero Runtime Dependencies**: The core CLI, MCP server, and Studio backend use exclusively Node.js built-ins (`node:sqlite`, `node:http`, `node:crypto`, `node:fs`).
- **Local-First Isolation**: Database (`.vectorforce/vectorforce.db`) uses SQLite WAL mode strictly within the user's local workspace. No telemetry or code leaks to external servers.
- **Claims vs Evidence Distinction**: Human intent and AI outputs are strictly treated as unverifiable `claims`; Git commit SHAs and SHA-256 document hashes are recorded as verifiable `evidence`.
- **Workspace Containment**: Document collection and AST indexing are strictly constrained to canonical workspace paths; symlinks and secrets (`.env`, `*.key`, `id_rsa`) are strictly ignored.

---

## Architecture Decision Records (ADR)

All design decisions are formalized in the [`wiki/`](wiki/README.md):

- [ADR-001: Event-driven context architecture](wiki/decisions/adr-001-event-driven-harness-independent-context-architecture.md)
- [ADR-002: Local-first checkpoints & disclosure boundaries](wiki/decisions/adr-002-local-first-checkpoints-and-disclosure-boundaries.md)
- [ADR-003: Portable checkpoints & cross-harness resume](wiki/decisions/adr-003-portable-checkpoints-and-cross-harness-resume.md)
- [ADR-012: Target harnesses: Antigravity & Command Code](wiki/decisions/adr-012-target-harness-selection-antigravity-commandcode-pidev.md)
- [ADR-013: AI reasoning layer & model provider authorization](wiki/decisions/adr-013-ai-reasoning-layer-and-provider-authorization.md)
- [ADR-014: VectorForce Studio & local topology visualizer](wiki/decisions/adr-014-vectorforce-studio-and-local-topology-visualizer.md)

---

## Verification & Test Suite

Run the full automated test suite (62 tests across 15 suites):

```bash
npm test
```
