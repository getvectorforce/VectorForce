# VectorForce Developer Support & Integration Guide

Welcome to the **VectorForce Developer Support & Integration Guide**. This document provides an end-to-end operational reference for software engineers, platform architects, and DevOps teams integrating VectorForce into agentic AI workflows, IDEs, and CI/CD pipelines.

---

## Table of Contents
1. [Architecture & Core Invariants](#1-architecture--core-invariants)
2. [Installation & System Verification](#2-installation--system-verification)
3. [Cloud Authentication & Session Management (`vf login`)](#3-cloud-authentication--session-management-vf-login)
4. [Cross-Machine & Team Context Sync (`vf push` / `vf pull`)](#4-cross-machine--team-context-sync-vf-push--vf-pull)
5. [AI Reasoning & Memory Continuity (`vf reason`)](#5-ai-reasoning--memory-continuity-vf-reason)
6. [Harness Integrations & MCP Protocol](#6-harness-integrations--mcp-protocol)
7. [Standard CLI Workflow Lifecycle](#7-standard-cli-workflow-lifecycle)
8. [VectorForce Studio Web Control Center (`vf studio`)](#8-vectorforce-studio-web-control-center-vf-studio)
9. [Troubleshooting & Frequently Asked Questions](#9-troubleshooting--frequently-asked-questions)
10. [Developer Support & Contact Channels](#10-developer-support--contact-channels)

---

## 1. Architecture & Core Invariants

VectorForce is a **zero-dependency, local-first engineering context platform**—often described as **"Git for AI Context"**. It solves the multi-agent context amnesia problem across tools like **Google Antigravity**, **Meta Muse**, **Claude Code**, **Command Code**, **OpenAI Codex**, **Cursor**, **Windsurf**, **GitHub Copilot**, and **Kiro IDE**.

### Guiding Principles:
- **Zero External Runtime Dependencies**: The core CLI, SQLite storage engine, MCP server, and Studio backend use **exclusively Node.js built-ins** (`node:sqlite`, `node:http`, `node:crypto`, `node:fs`, `node:child_process`).
- **Claims vs. Evidence Distinction**:
  - Model or human inputs (`goals`, `constraints`, `decisions`, `next_steps`) are stored as **unverifiable claims**.
  - System facts (Git commit hashes, dirty states, and SHA-256 file digests) are recorded as **verifiable evidence**.
- **Safe Receipts**: Operation receipts returned by commands never contain raw document contents or credentials.
- **Strict Document Allowlist**: Only explicitly allowlisted text/markdown files (max `8 KiB` per file, `64 KiB` per checkpoint) are ingested. Path traversal (`..`) and symlinks are strictly rejected.

```text
┌────────────────────────────────────────────────────────┐
│   AI Agents (Antigravity, Muse, Codex, Claude Code)    │
└───────────────────────────▲────────────────────────────┘
                            │ JSON-RPC 2.0 (stdio)
┌───────────────────────────▼────────────────────────────┐
│          VectorForce MCP Server (`vf mcp`)             │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Operations: Checkpoint, Briefing, Drift, Handoff  │
└─────────────▲────────────────────────────▲─────────────┘
              │                            │
┌─────────────▼──────────────┐  ┌──────────▼─────────────┐
│  Local SQLite WAL Engine   │  │  Zero-Knowledge E2EE   │
│ (.vectorforce/vectorforce) │  │ VectorForce Cloud Hub  │
└────────────────────────────┘  └────────────────────────┘
```

---

## 2. Installation & System Verification

### Prerequisites
- **Node.js**: `>= 22.5.0` (with built-in `node:sqlite` enabled).
- **Operating System**: macOS, Linux, or Windows (WSL & native PowerShell supported).
- **Git**: `>= 2.30.0` (for verifiable workspace commit evidence).

### Installation Methods

```bash
# Global CLI installation (Recommended)
npm install -g vectorforce

# Or run directly via npx without global install
npx vectorforce status

# Verify installation
vf --version
```

### Workspace Health Check (`vf doctor`)
Run the diagnostic suite in any project repository:

```bash
vf doctor
```

Output:
```text
VectorForce Diagnostics (/path/to/project):
  ✔ [READY]   SQLite Engine (.vectorforce/vectorforce.db)
  ✔ [READY]   Agent Protocol Rules (AGENTS.md)
  ✔ [READY]   Harness MCP Configurations
  ✔ [READY]   Git Head & Hash Provider
```

---

## 3. Cloud Authentication & Session Management (`vf login`)

VectorForce provides seamless single sign-on (SSO) with **VectorForce Cloud**, supporting both developer browser logins and headless CI/CD automation.

### A. Developer Browser SSO Login
Developers can authenticate with one command without copying keys manually:

```bash
vf login
```

1. The CLI launches an ephemeral loopback server on `127.0.0.1:<PORT>`.
2. Automatically opens your default browser to the VectorForce Cloud login portal:
   `https://omprakash-pce2011--vectorforce-cloud-vectorforce-cloud-web.modal.run/login`
3. Enter your enterprise credentials or subscription key and click **Authorize**.
4. The cloud redirects back to `http://127.0.0.1:<PORT>/callback?key=...&state=...`.
5. The CLI validates the state nonce, commits the session to `~/.vectorforce/config.json`, and finishes.

### B. CI/CD & Headless Automation
In continuous integration pipelines (GitHub Actions, GitLab CI, Docker, Kubernetes) where browsers cannot open:

#### Step 1: Mint a Scoped Temporary Token
```bash
# Generate a temporary token valid for 24 hours:
vf token create --ttl 24
```

Output:
```text
🎫 Generated Temporary Enterprise CI/CD Token:
  Token:       vf_temp_ci_98a7bc65_1794078000000
  Scope:       Enterprise Cloud Continuous Integration
  Valid For:   24 hour(s)
```

#### Step 2: Authenticate in CI Pipeline
```bash
# Option 1: Pass token directly via flag
vf login --token "vf_temp_ci_98a7bc65_1794078000000" --ci

# Option 2: Set as an environment secret
export VF_SUBSCRIPTION_KEY="vf_temp_ci_98a7bc65_1794078000000"
```

### C. Inspecting Active Sessions (`vf whoami`)
```bash
vf whoami
```

Output:
```text
VectorForce Cloud Active Session:
  Cloud Endpoint:   https://omprakash-pce2011--vectorforce-cloud-vectorforce-cloud-web.modal.run
  Auth Mode:        Enterprise Subscription Key
  Subscription Key: vf_live_sub_...e4d9
  Default Project:  proj-meta-e2ee
  Auth Source:      global (~/.vectorforce/config.json)
  Session Status:   Active (HTTP 200 OK)
  Organization:     VectorForce Cloud Hub [Tier: Enterprise Cloud E2EE Hub]
```

### D. Logging Out (`vf logout`)
```bash
vf logout
```

---

## 4. Cross-Machine & Team Context Sync (`vf push` / `vf pull`)

VectorForce implements Zero-Knowledge End-to-End Encryption (**X25519 ECDH + AES-256-GCM + Ed25519 signatures**). The cloud server only ever sees encrypted ciphertexts.

```bash
# 1. On Computer 1 (e.g. MacBook Pro running Antigravity):
vf task auth-migration "Migrate legacy tokens to PKCE"
vf checkpoint --task auth-migration --summary "Added PKCE SHA-256 verifier"
vf push

# 2. On Computer 2 (e.g. Linux workstation or teammate running Claude Code):
vf pull
```

During `vf pull`:
- Computer 2 pulls the encrypted envelope.
- Cryptographically verifies the Ed25519 author signature.
- Decrypts the context payload via X25519 ECDH + AES-256-GCM.
- Reconciles the claims, decisions, and evidence into the local SQLite database.
- Runs Meta Muse AI reasoning to synthesize an immediate briefing.

---

## 5. AI Reasoning & Memory Continuity (`vf reason`)

VectorForce allows developers and agents to reason over accumulated decisions, invariant constraints, and live codebase symbols.

### Supported Providers & Priority:
1. **Meta Muse Direct API (`muse-spark-1.3`)** — *#1 Priority*:
   ```bash
   vf config muse <YOUR_META_API_KEY>
   vf reason --task auth-migration
   ```

2. **Meta Muse Spark Open (`muse-spark-open` • 1M Context)** via Fireworks AI or OpenRouter:
   ```bash
   vf config fireworks <KEY> accounts/fireworks/models/muse-spark-open
   vf config openrouter <KEY> meta/muse-spark-open
   ```

3. **Local Ollama (Offline / Air-Gapped)**:
   ```bash
   vf config ollama --model llama3.3
   ```

4. **Commercial & BYOK Providers**:
   ```bash
   vf config openai <OPENAI_API_KEY> --model o3-mini
   vf config anthropic <ANTHROPIC_KEY> --model claude-3-7-sonnet
   ```

5. **Deterministic Mode (No LLM calls)**:
   ```bash
   vf reason --task auth-migration --raw
   ```

---

## 6. Harness Integrations & MCP Protocol

VectorForce includes pre-configured Model Context Protocol (MCP) bridges for all popular AI engineering harnesses:

```bash
# List detected harnesses
vf config list

# Install integration for a specific tool or all
vf config install antigravity
vf config install all
```

### Harness Mapping Directory:
| Harness | Configuration File | Steering Instructions |
| :--- | :--- | :--- |
| **Google Antigravity** | `.agents/mcp_config.json` | `AGENTS.md` |
| **Meta Muse** | `.muse/mcp_config.json` | `~/.config/muse/settings.json` |
| **Claude Code & Command Code** | `.mcp.json` | `commandcode.json` |
| **OpenAI Codex** | `.codex/config.toml` | `codex.json` |
| **Cursor IDE** | `.cursor/mcp.json` | `.cursorrules` |
| **Windsurf (Cascade)** | `.windsurf/mcp_config.json` | `.windsurfrules` |
| **GitHub Copilot (VS Code)** | `.vscode/mcp.json` (`servers`) | `.github/copilot-instructions.md` |
| **Kiro IDE** | `.kiro/settings/mcp.json` | `.kiro/steering/vectorforce.md` |

---

## 7. Standard CLI Workflow Lifecycle

```bash
# 1. Initialize VectorForce in an existing repository
vf init "Project-Name"

# 2. Register an active engineering task
vf task feat-e2ee "Implement X25519 Envelope Encryption"

# 3. Allowlist critical architecture spec files (<8 KiB)
vf policy add AGENTS.md
vf policy add docs/architecture-spec.md

# 4. Commit an immutable checkpoint
vf checkpoint --task feat-e2ee \
  --summary "Completed ECDH handshake" \
  --goal "Enforce zero-knowledge E2EE" \
  --constraint "Zero external dependencies" \
  --decision "DEC-01:ECDH:Use native node:crypto" \
  --next "Implement unit tests" \
  --doc AGENTS.md

# 5. Check for code or document drift
vf drift --task feat-e2ee

# 6. Generate resume briefing for another agent (e.g. Antigravity)
vf resume --task feat-e2ee --dest antigravity

# 7. Export an HMAC-SHA256 signed handoff bundle
vf export --task feat-e2ee --recipient "DevOps Team" --out ./handoff.json

# 8. Weekly timeline and engineering recap
vf recap --days 7
```

---

## 8. VectorForce Studio Web Control Center (`vf studio`)

VectorForce Studio is an interactive visual cockpit for exploring tasks, architectural decisions, and dependency graphs.

```bash
vf studio --port 3210
# Alias:
vf ui
```

- **URL**: `http://127.0.0.1:3210`
- **Features**:
  - Live Semantic Topology Layout & AST edge mapping.
  - Interactive Decision Ledger & Timeline inspection.
  - Live Git commit, branch, and dirty status monitoring.
  - Visual AI Provider configuration switcher.

---

## 9. Troubleshooting & Frequently Asked Questions

### Q: Why do I see `ExperimentalWarning: SQLite is an experimental feature`?
**A:** Node.js 22+ includes `node:sqlite` natively. The warning is emitted once on process startup by the Node.js runtime and has zero impact on database performance, stability, or data integrity.

### Q: How do I resolve `⚠️ DRIFT DETECTED`?
**A:** Drift indicates that an allowlisted document's SHA-256 hash or the Git commit changed since the last recorded checkpoint. To resolve:
1. Run `git diff` to inspect changes.
2. If changes are intentional, commit a new checkpoint: `vf checkpoint --task <id> --summary "Updated spec"`.

### Q: What is the maximum document size supported?
**A:** VectorForce enforces a hard limit of **8 KiB per document** and **64 KiB total per checkpoint** to prevent prompt bloat and context poisoning. Large binaries or minified files are automatically rejected.

### Q: Can VectorForce run completely offline?
**A:** Yes! The core CLI, local SQLite engine, AST symbol indexer, and MCP server have **zero network requirements**. If offline, `vf reason` functions deterministically using `--raw` or via a local Ollama model.

---

## 10. Developer Support & Contact Channels

| Channel | Link / Location | Purpose |
| :--- | :--- | :--- |
| **GitHub Issues** | [github.com/getvectorforce/VectorForce/issues](https://github.com/getvectorforce/VectorForce/issues) | Bug reports, feature proposals, and RFCs |
| **Documentation & Web** | [getvectorforce.github.io](https://getvectorforce.github.io) | Live documentation, installation guides, and blog |
| **VectorForce Cloud Hub** | [Live Cloud Hub](https://omprakash-pce2011--vectorforce-cloud-vectorforce-cloud-web.modal.run/?project=proj-meta-e2ee) | Interactive Project Switcher, Timeline, and Team Dashboard (use `vf login` for CLI SSO) |
| **Video Walkthrough** | [YouTube Video (2m 21s)](https://youtu.be/Ufb_IjCU2l4) | End-to-end narrated architecture and demo |
| **Social & Community** | [X / Twitter (@Vectorforce26)](https://x.com/Vectorforce26) • [LinkedIn](https://www.linkedin.com/company/vectorforce) | Announcements, hackathon updates, and community |

