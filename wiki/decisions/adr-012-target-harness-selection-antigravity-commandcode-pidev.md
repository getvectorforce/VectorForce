# ADR-012: Target Harness Selection: Antigravity, Command Code, and Pi.dev

- **Date:** 2026-10-17
- **Status:** Proposed / Accepted for evaluation
- **Scope:** Target coding harnesses, macOS host environment, and MCP/CLI integration surfaces
- **[Decision index](../README.md)**
- **Supersedes / Refines:** [ADR-009: Copilot And Pi Evaluation Pair](adr-009-copilot-and-pi-evaluation-pair.md)

## Context

The initial evaluation pair recorded in [ADR-009](adr-009-copilot-and-pi-evaluation-pair.md) assumed GitHub Copilot in VS Code alongside Pi on a Windows host machine. 

The project has transitioned to macOS as the active operating system, and the core requirement has evolved to support seamless engineering context sharing between:
1. **Google Antigravity** — The primary agentic IDE environment.
2. **Command Code (`command-code`)** — A terminal-first AI coding agent with neuro-symbolic style adaptation, MCP support, and interactive CLI.
3. **Pi (`pi.dev`)** — A minimalist, extensible terminal agent harness featuring tree-structured sessions, TypeScript extensions, and RPC/headless modes.

The goal is to enable developers to checkpoint tasks in Antigravity and resume them accurately in Command Code or Pi.dev (and vice versa), maintaining context continuity, intent, decisions, and evidence without leaking unapproved source code or requiring continuous background observation.

## Evaluation Direction

Establish **Google Antigravity** as the primary IDE harness, paired with **Command Code** and/or **Pi.dev** as the terminal-based coding harnesses.

Each harness has a distinct architecture, interaction pattern, and extension model. Blue Project (VectorForce) must preserve its harness-independent design ([ADR-001](adr-001-event-driven-harness-independent-context-architecture.md)) by serving both environments via common protocol operations (`context`, `resume`, `checkpoint`, `handoff`, `end`) exposed through:
1. **Unified CLI** (`vf` / command-line launcher) for direct manual and scriptable operations.
2. **Model Context Protocol (MCP) Server** (stdio-based) for direct, first-class tool invocation by agentic harnesses.

## Harness Capability & Integration Matrix

| Capability | Google Antigravity | Command Code (`command-code`) | Pi (`pi.dev`) |
| :--- | :--- | :--- | :--- |
| **Form Factor** | Agentic IDE & pair programming environment | Terminal-first interactive agent (`cmd`) + companion UI | Minimalist terminal coding agent (`pi`) |
| **Model / Provider** | Gemini / Frontier models via Antigravity runtime | Multi-model (frontier & open-weights, `taste-1` adaptation) | Multi-model (`pi-ai` unified layer, Claude, OpenAI, local) |
| **MCP Support** | Native first-class MCP server support | Native MCP support via config (`commandcode.json`) | Supported via TypeScript extensions / MCP bridges |
| **CLI / Direct Execution** | Sandboxed & unsandboxed terminal execution | Interactive slash commands (`/`), subshell commands (`!`) | Built-in `bash` tool, interactive slash commands |
| **Instruction Discovery** | Project rules, skills, and `.gemini/antigravity` configuration | `AGENTS.md` and repository instructions | System prompt configuration and custom skills |
| **Session Model** | Multi-agent, persistent conversation & artifact tracking | Turn-based chat and persistent terminal workspace | Tree-structured sessions (`/tree`, `/fork`, `/clone`) |
| **Local Runtime OS** | macOS / POSIX (active developer environment) | macOS / Linux / Windows (Node-based CLI) | macOS / Linux / Windows (Node/Bun/TS CLI) |

## Integration Strategy

### 1. Model Context Protocol (MCP) as the Primary Bridge
Both **Antigravity** and **Command Code** provide native support for MCP servers. Exposing the VectorForce runtime via a local stdio MCP server (`vf mcp`) provides:
- Structured tools (`save_checkpoint`, `get_resume_briefing`, `list_tasks`, `export_handoff`, `import_handoff`).
- Formal JSON schemas for arguments and returns, preventing shell escaping issues and prompt distortion.
- Developer-governed permission approvals natively handled by each harness's tool approval model.

### 2. Standalone CLI as the Universal Fallback
For environments where MCP is not configured or for scripted workflows:
- A dependency-free CLI (`vf`) enables explicit operations from terminal sessions (used directly by Pi.dev via its built-in `bash` tool or interactive commands, and usable within Antigravity terminals).

### 3. Pi.dev Custom Extension (Optional Enhancement)
For **Pi.dev**, a lightweight TypeScript extension (`@vectorforce/pi-extension` or local `.pi/extensions/vectorforce.ts`) can register custom `/checkpoint` and `/resume` commands that map cleanly to VectorForce operations.

## Security & Disclosure Invariants

- **Destination-Bound Content:** Context exported or resumed across harnesses must adhere to [ADR-002](adr-002-local-first-checkpoints-and-disclosure-boundaries.md). Passing context from Antigravity to Command Code or Pi.dev must evaluate destination authorization before returning briefing bodies.
- **No Implicit Cross-Tool Scraping:** Neither harness may passively watch or scrape the other harness's private logs or session stores. Continuity is driven solely by explicit checkpoints and authorized handoffs.
- **Local Isolation:** On macOS, local storage remains confined to developer-approved application directories (e.g. `~/.vectorforce` or project-local state) outside cloud-synchronized folders by default.

## Consequences

- Replacing Copilot/Windows with Antigravity/macOS reflects the actual current development environment and leverages Antigravity's advanced agentic capabilities.
- Both Command Code and Pi.dev offer active terminal agent paradigms, providing strong testbeds for evaluating whether the resume briefing format conveys intent effectively to non-IDE agents.
- Native MCP support significantly simplifies the harness adapter layer for Antigravity and Command Code compared to prompt injection or brittle instruction scraping.

## Open Questions

- Should MCP be the mandatory primary interface for both Antigravity and Command Code, keeping CLI primarily for manual checks and Pi.dev?
- How should Pi.dev's tree-structured session history map into VectorForce's immutable checkpoint graph?
- What is the minimal briefing size budget that provides effective resume in Command Code without exhausting model context?
