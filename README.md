# VectorForce (VF)

> **Git for AI Context** — A local-first, privacy-preserving engineering memory platform and architecture control center for AI coding agents.

<p align="center">
  <img src="assets/vectorforce-banner.jpg" alt="VectorForce — Shared Context. Collective Intelligence." width="100%" />
</p>

[![Website](https://img.shields.io/badge/website-getvectorforce.github.io-6366f1.svg)](https://getvectorforce.github.io/)
[![YouTube Demo](https://img.shields.io/badge/YouTube-Watch%20Demo%20(2m%2021s)-FF0000.svg?logo=youtube&logoColor=white)](https://youtu.be/Ufb_IjCU2l4)
[![X (Twitter)](https://img.shields.io/badge/X-@Vectorforce26-000000.svg?logo=x&logoColor=white)](https://x.com/Vectorforce26/status/2118121822176809265)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-VectorForce-0A66C2.svg?logo=linkedin&logoColor=white)](https://www.linkedin.com/company/vectorforce)
[![Tests](https://img.shields.io/badge/tests-94%20passing%20(Linux%20%7C%20macOS%20%7C%20Windows)-brightgreen.svg)](https://github.com/getvectorforce/VectorForce/actions)
[![Dependencies](https://img.shields.io/badge/backend%20runtime%20deps-zero-blue.svg)](#architecture-invariants)
[![Storage](https://img.shields.io/badge/storage-local%20SQLite%20WAL-orange.svg)](#local-first-architecture)
[![Harnesses](https://img.shields.io/badge/harnesses-Antigravity%20%7C%20Claude%20Code%20%7C%20Command%20Code%20%7C%20Codex%20%7C%20Muse-purple.svg)](#model-context-protocol-mcp)
[![Hackathon](https://img.shields.io/badge/Meta%20Muse%20Hackathon-2026-blueviolet.svg)](#5-reason-over-context-ai-engineering-memory)

---

## 🌐 Official Links & Community
- 🌍 **Official Website:** [https://getvectorforce.github.io/](https://getvectorforce.github.io/)
- 🎬 **YouTube Demo Video:** [https://youtu.be/Ufb_IjCU2l4](https://youtu.be/Ufb_IjCU2l4)
- 🐦 **X (Twitter):** [@Vectorforce26](https://x.com/Vectorforce26) • [Contest Announcement Post](https://x.com/Vectorforce26/status/2118121822176809265)
- 💼 **LinkedIn:** [VectorForce Company Page](https://www.linkedin.com/company/vectorforce)
- 📦 **NPM Registry:** [https://www.npmjs.com/package/vectorforce](https://www.npmjs.com/package/vectorforce)

---

## 🎬 Product Demo Video (2m 21s)

> **Watch how VectorForce eliminates Coding Agent Amnesia across 8 AI harnesses:**

[![VectorForce Demo Video](https://img.shields.io/badge/Watch%20on%20YouTube-2m%2021s-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/Ufb_IjCU2l4)
[![Interactive Site Demo](https://img.shields.io/badge/Interactive-Watch%20on%20Official%20Site-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white)](https://getvectorforce.github.io/#demo-video)

| Timestamp | Chapter | Milestone Demonstrated |
| :--- | :--- | :--- |
| **00:00** | **1. The Problem** | Coding Agent Amnesia: Vanishing ADRs across Antigravity, Cursor & Claude |
| **00:26** | **2. Zero-Dep Core** | `vf config install all` auto-configures 8 AI harnesses via MCP |
| **00:55** | **3. Claims vs Evidence** | Cryptographic fence: Git SHAs + doc digests vs unverified model claims |
| **01:25** | **4. Studio UI & Swarm** | Interactive architecture topology on port 3210 & 5-agent banking swarm |
| **01:55** | **5. AI Reasoning & Wrap-Up** | Meta Muse & Llama 3.3 synthesis layer + npm quickstart |

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

## Architecture & System Topology

VectorForce is engineered with a strict **Local-First & Zero Runtime Dependency** design. It operates entirely through Node.js built-ins (`node:sqlite`, `node:crypto`, `node:http`, `node:fs`) and integrates seamlessly across local IDEs, multi-agent MCP bridges, and zero-knowledge cloud sync.

```mermaid
flowchart TD
    subgraph AI_Harnesses["AI Coding Agent Ecosystem (MCP Protocol)"]
        A1["⚡ Google Antigravity"]
        A2["🦙 Meta Muse"]
        A3["⌘ Claude / Command Code"]
        A4["◈ OpenAI Codex"]
        A5["🖱️ Cursor IDE"]
        A6["🌊 Windsurf Cascade"]
        A7["🐙 GitHub Copilot"]
        A8["⚡ Kiro IDE"]
    end

    subgraph VectorForce_Core["VectorForce Core Engine (Zero Runtime Dependencies)"]
        direction TB
        MCP["MCP Server & JSON-RPC Bridge\n(src/mcp/mcp-server.js • stdio)"]
        CLI["CLI Control Interface\n(bin/vf.js • init, status, drift, resume)"]
        
        AUTH["Zero-Leak Policy Authorizer\n(src/policy/authorizer.js • Symlink & Containment Guard)"]
        
        subgraph Operations["Operations & Synthesis Services"]
            CHK["Checkpoint Service\n(Claims vs Evidence Fencing)"]
            BRF["Briefing & Drift Service\n(Git HEAD & SHA-256 Hash Matching)"]
            RSN["AI Reasoning Service\n(Meta Muse • Fireworks • Llama 3.3)"]
            HDF["Handoff Service\n(HMAC-SHA256 Manifest Export/Import)"]
        end

        subgraph Providers["Zero-Dep Workspace Observers"]
            GIT["Git Provider\n(Branch, Commit SHA, Diff, Dirty Tree)"]
            DOC["Document Provider\n(Allowlisted Spec Reader & SHA-256 Hashes)"]
            AST["Code Index Provider\n(AST Symbols & Import Dependency Graph)"]
        end

        DB[("Local SQLite WAL Store\n(.vectorforce/vectorforce.db\nnode:sqlite WAL mode)")]
    end

    subgraph Studio_UI["Local VectorForce Studio (Web UI)"]
        WEB["Studio HTTP Server (127.0.0.1:3210)\nReact + Vite + Tailwind + XYFlow"]
    end

    subgraph Cloud_Layer["VectorForce Cloud (Modal.com / E2EE Sync)"]
        REMOTE["Zero-Knowledge Wire & Hub\nX25519 ECDH + AES-256-GCM + Ed25519 Signature\n(Multi-Project Hub • PM Interpreter Portal)"]
    end

    %% Wiring
    A1 & A2 & A3 & A4 & A5 & A6 & A7 & A8 <-->|"stdio JSON-RPC 2.0"| MCP
    CLI --> AUTH
    MCP --> AUTH
    AUTH --> Operations
    Operations <--> Providers
    Operations <--> DB
    DB <--> WEB
    Operations <-->|"vf push / vf pull\n(Encrypted Ciphertext)"| REMOTE
```

---

## Tech Stack Overview

VectorForce adheres to strict architectural purity, ensuring rock-solid stability, privacy, and speed without bloated dependency chains.

| Layer | Technology | Rationale / Key Capabilities |
| :--- | :--- | :--- |
| **Runtime & Core** | **Node.js (>= 22.5.0 ESM)** | Pure ES Modules, fast startup, native cross-platform support (macOS, Linux, Windows). |
| **Backend Dependencies** | **Zero External Runtime Dependencies** | Powered 100% by Node.js built-ins: `node:sqlite`, `node:crypto`, `node:http`, `node:fs`, `node:child_process`, `node:os`. |
| **Storage Engine** | **`node:sqlite` (WAL Mode)** | Local-first, zero-configuration database (`.vectorforce/vectorforce.db`) with Write-Ahead Logging for atomic concurrent reads/writes. |
| **Cryptographic Security** | **`node:crypto` (HMAC-SHA256, AES-256-GCM, X25519, Ed25519)** | Tamper-evident handoffs, verifiable file digests, and end-to-end zero-knowledge multi-machine sync. |
| **Protocol Integration** | **Model Context Protocol (MCP)** | JSON-RPC 2.0 over standard I/O (`stdio`), 9 deterministic tools, and auto-configuration for 8+ AI harnesses. |
| **AI Reasoning Layer** | **Meta Muse & Llama 3.3** | Native adapters for **Meta Muse (`muse-spark-1.3`)**, **Meta Muse Spark Open** (Fireworks AI / OpenRouter), Local **Ollama**, **OpenAI**, and **Anthropic** with graceful offline briefing fallback. |
| **AST & Code Indexer** | **Custom Zero-Dependency Regex/Tokenizer Indexer** | Extracts symbols (classes, functions, interfaces), imports, and module dependency graphs without heavy external parser bloat. |
| **Local Studio Frontend** | **React 18 + Vite + Tailwind CSS + XYFlow** | Interactive architecture control center, live blast radius inspector, Claims vs Evidence timeline, and memory console. |
| **Cloud Remote Sync** | **Modal.com Serverless Container (Debian + Node 22)** | Zero-Knowledge E2EE relay hub, scale-to-zero serverless deployment, PM Interpreter, and Multi-Project switcher. |

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

### 1. Initialize a Project (auto-detects your AI harness)
```bash
node bin/vf.js init
# Only detected harnesses are configured; repos with no harness get no MCP files yet.
node bin/vf.js config list                  # supported harnesses + detected/configured status
node bin/vf.js config install cursor       # or: --harness on init, or install all
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

### 5. Multi-Machine & Team Cloud Sync (`vf remote`, `vf push`, `vf pull`)

VectorForce follows the Git mental model for sharing context between two computers or across a team using Zero-Knowledge End-to-End Encryption (`X25519` + `AES-256-GCM` + `Ed25519`):

```bash
# 1. Connect local workspace to your Cloud Remote once:
node bin/vf.js remote set https://omprakash-pce2011--vectorforce-cloud-vectorforce-cloud-web.modal.run \
  --key vf_live_sub_98a7bc65f012e4d9 \
  --project proj-bistro-pos

# 2. Push local checkpoints & tasks to Cloud (E2EE):
node bin/vf.js push

# 3. Pull & reconcile context on Computer 2 (reconciles into SQLite & runs Meta Muse reasoning):
node bin/vf.js pull
```

### 6. Reason Over Context (AI Engineering Memory)

VectorForce prioritizes **Meta Muse (`muse-spark-1.3`)** and the open-weights **Meta Muse Spark Open (`muse-spark-open` • 1M token context window)** as its **#1 reasoning models**, while also supporting **Fireworks AI**, **OpenRouter**, **Local Ollama**, **OpenAI / Codex**, **Anthropic Claude**, and any **Custom BYOK** OpenAI-compatible endpoint:

```bash
# 1. [1st Priority] Meta Muse Direct API (Responses API at api.meta.ai/v1 • muse-spark-1.3):
node bin/vf.js config muse <YOUR_META_API_KEY>
node bin/vf.js reason --task auth-module

# 2. [1st Priority Open-Weights] Meta "Muse Spark Open" (1M Context) via Fireworks AI:
node bin/vf.js config fireworks <YOUR_FIREWORKS_API_KEY> accounts/fireworks/models/muse-spark-open
node bin/vf.js reason --task auth-module

# 3. OpenRouter — Meta Muse Spark Open (meta/muse-spark-open), DeepSeek, Claude, Llama 3.3:
node bin/vf.js config openrouter <YOUR_OPENROUTER_API_KEY> meta/muse-spark-open
node bin/vf.js config openrouter <YOUR_OPENROUTER_API_KEY> deepseek/deepseek-v4.1-flash-1017
node bin/vf.js reason --task auth-module

# 4. Local Ollama (100% Offline & Private — Default when no cloud API key is set):
ollama pull llama3.1:8b
node bin/vf.js config ollama llama3.1:8b
node bin/vf.js reason --task auth-module

# 5. OpenAI / Codex (o3-mini, gpt-4.1, gpt-4o):
node bin/vf.js config openai <YOUR_OPENAI_API_KEY> o3-mini
node bin/vf.js reason --task auth-module

# 6. Anthropic Claude (claude-sonnet-4-20250514, claude-3-7-sonnet-latest):
node bin/vf.js config anthropic <YOUR_ANTHROPIC_API_KEY> claude-sonnet-4-20250514
node bin/vf.js reason --task auth-module

# 7. Custom BYOK (Groq, Together AI, LM Studio, vLLM, Azure):
node bin/vf.js config byok https://api.groq.com/openai/v1 <GROQ_API_KEY> llama-3.3-70b-versatile
node bin/vf.js config byok http://127.0.0.1:1234/v1 lm-studio qwen2.5-coder-14b

# Check active model configuration or run deterministic briefing (--raw):
node bin/vf.js config status
node bin/vf.js reason --task auth-module --raw

# Launch VectorForce Studio Web Control Center on http://127.0.0.1:3210
node bin/vf.js studio
```

---

## Model Context Protocol (MCP)

VectorForce exposes a standard stdio JSON-RPC MCP server for direct integration into **Google Antigravity**, **Claude Code**, **Command Code**, **Meta Muse**, **OpenAI Codex**, **Cursor**, **Windsurf**, **GitHub Copilot**, and **Kiro IDE**.

> **How MCP Starts:** You **never** need to run `vf mcp` manually in a terminal. Each AI coding agent reads its configuration file below and automatically spawns VectorForce in the background over `stdio`. Generated entries use the absolute Node.js runtime path, so GUI-launched clients find it even when `node` is not on their PATH (common on Windows).

| AI Coding Client | Config File Read by Client | 1-Command Auto-Setup |
|---|---|---|
| **Google Antigravity** | `.agents/mcp_config.json` & `~/.gemini/config/mcp_config.json` (or `~/.gemini/antigravity/mcp_config.json`) | `node bin/vf.js config install antigravity` |
| **Claude Code (`claude`)** | `.mcp.json` (project root) | `node bin/vf.js config install claude-code` |
| **Command Code (`cmd`)** | `.mcp.json` & `commandcode.json` | `node bin/vf.js config install command-code` |
| **Meta Muse (`muse`)** | `~/.config/muse/settings.json` (global `mcpServers`; `.muse/mcp_config.json` kept as mirror) | `node bin/vf.js config install muse` |
| **OpenAI Codex (`codex`)** | `.codex/config.toml` & `~/.codex/config.toml` | `node bin/vf.js config install codex` |
| **Cursor IDE** | `.cursor/mcp.json` & `.cursorrules` | `node bin/vf.js config install cursor` |
| **Windsurf (Codeium)** | `.windsurf/mcp_config.json` & `.windsurfrules` | `node bin/vf.js config install windsurf` |
| **GitHub Copilot / VS Code** | `.vscode/mcp.json` (top-level `servers`) & `.github/copilot-instructions.md` | `node bin/vf.js config install copilot` |
| **Kiro IDE** | `.kiro/settings/mcp.json` & `kiro.json` | `node bin/vf.js config install kiro` |

### Automated Configuration & Health Check
```bash
# Auto-configure all 9 supported AI harnesses at once:
node bin/vf.js config install all

# Verify SQLite DB, AGENTS.md, and all MCP client configs:
node bin/vf.js status
```

### JSON Configuration (Antigravity, Claude Code, Command Code, Muse, Cursor, Windsurf, VS Code, Kiro)
```json
{
  "mcpServers": {
    "vectorforce": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/VectorForce/bin/vf.js", "mcp"]
    }
  }
}
```

### TOML Configuration (OpenAI Codex CLI: `.codex/config.toml`)
```toml
[mcp_servers.vectorforce]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/VectorForce/bin/vf.js", "mcp"]
[mcp_servers.vectorforce.env]
VF_HARNESS = "codex"
```

---

## How to Configure & Update MCP for Any Other AI Coding Harness

If your AI assistant or IDE is not in the auto-configured list above, you can connect it to VectorForce in seconds using standard MCP configuration:

### 1. Cline & Roo Code (VS Code Extension)
Open VS Code Settings or click the **MCP** icon in the Cline panel:
- Open `cline_mcp_settings.json` (or `roo-cline_mcp_settings.json`) located at:
  - **macOS:** `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
  - **Linux:** `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
  - **Windows:** `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- Add the VectorForce entry:
```json
{
  "mcpServers": {
    "vectorforce": {
      "command": "npx",
      "args": ["-y", "vectorforce", "mcp"],
      "disabled": false,
      "autoApprove": [
        "list_tasks",
        "check_workspace_drift",
        "get_resume_briefing",
        "save_checkpoint",
        "reason_about_task"
      ]
    }
  }
}
```

### 2. Zed Editor
Zed natively supports MCP context servers. Open your Zed configuration (`~/.config/zed/settings.json` or `cmd-,`):
```json
{
  "context_servers": {
    "vectorforce": {
      "command": {
        "path": "npx",
        "args": ["-y", "vectorforce", "mcp"]
      }
    }
  }
}
```

### 3. JetBrains IDEs (IntelliJ IDEA, WebStorm, PyCharm, RustRover)
For JetBrains IDEs supporting MCP or AI Assistant:
1. Open **Settings / Preferences** (`Ctrl+Alt+S` or `Cmd+,`).
2. Search for **Model Context Protocol** or **AI Assistant → Context Providers**.
3. Click **Add Stdio Server**:
   - **Name:** `vectorforce`
   - **Command:** `node` (or `npx`)
   - **Arguments:** `/path/to/VectorForce/bin/vf.js mcp` (or `-y vectorforce mcp`)
   - **Environment Variables:** `VF_HARNESS=jetbrains`

### 4. Sourcegraph Cody
In Sourcegraph Cody settings (`cody.experimental.mcp.servers` in VS Code or JetBrains):
```json
{
  "cody.experimental.mcp.servers": {
    "vectorforce": {
      "command": "node",
      "args": ["/path/to/VectorForce/bin/vf.js", "mcp"]
    }
  }
}
```

### 5. Aider (`aider-chat`)
Aider integrates directly with Git and can ingest VectorForce's immutable architectural briefings:
```bash
# Pipe VectorForce briefing directly to Aider on session start:
node bin/vf.js resume --task <task_id> --dest cli --raw | aider

# Or generate project conventions before running aider:
node bin/vf.js resume --task <task_id> --dest cli --raw > CONVENTIONS.md
aider
```

### 6. Generic MCP Client (Any Tool Speaking JSON-RPC 2.0 over Stdio)
For any agent running locally, pass:
- **Executable:** `node`
- **Arguments:** `["/path/to/bin/vf.js", "mcp"]`
- **Working Directory:** Path to your project workspace
- **Environment:** `VF_WORKSPACE=/path/to/project` (optional if working directory matches)

Whenever you update VectorForce (`npm update -g vectorforce`), simply restart your AI agent or IDE window to immediately use the latest MCP tools.

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

## Verification & Cross-OS Test Suite (Linux, macOS, Windows)

Run the full automated test suite (75 unit & security tests) and the 7-stage practical multi-developer environment simulation:

```bash
# Run all 75 unit, policy, MCP, and security tests:
npm test

# Run the 7-stage practical real-world environment simulation (Git + CLI + live MCP stdio + Handoff + Drift):
npm run test:practical
```
