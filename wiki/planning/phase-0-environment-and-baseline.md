# Phase 0 Deliverable: Local Evaluation Environment, Capabilities, and Baseline

- **Date:** 2026-10-17
- **Status:** Complete
- **Scope:** Tasks T01, T02, T03, and T04 from [MVP Task Breakdown](mvp-task-breakdown.md)
- **Reference ADRs:** [ADR-008](../decisions/adr-008-mvp-boundary-and-architecture-validation.md) and [ADR-012](../decisions/adr-012-target-harness-selection-antigravity-commandcode-pidev.md)

---

## 1. T01: Local Evaluation Environment Inventory

The host environment has been inspected using non-destructive, read-only commands.

| Component | Status / Version | Path | Notes / Constraints |
| :--- | :--- | :--- | :--- |
| **Operating System** | macOS 15.7.9 (Build 24G830, x86_64) | Host kernel Darwin | Native Unix environment, POSIX permissions |
| **Node.js Runtime** | `v22.23.2` | `/Users/omprakashprajapat/.nvm/versions/node/v22.23.2/bin/node` | Managed via nvm; includes built-in `node:test` and `node:sqlite` (experimental/v22) |
| **Package Manager** | npm `12.0.2` | `/Users/omprakashprajapat/.nvm/versions/node/v22.23.2/bin/npm` | Global packages: `command-code@1.84.0`, `corepack@0.34.6` |
| **Alternative Runtimes**| Bun: `not found`, pnpm: `not found` | N/A | Dependency-free Node scripts are strictly adhered to |
| **Version Control** | Apple Git `2.39.5` | `/usr/bin/git` | Standard Apple developer toolchain |
| **SQLite Engine** | SQLite `3.43.2` (2023-10-10) | `/usr/bin/sqlite3` | System-bundled SQLite binary |
| **Primary IDE Harness**| Google Antigravity | Current Agent Workspace | Native MCP client, interactive chat, background tasks, subagents, and sandboxed execution |
| **Terminal Harness 1** | Command Code `1.84.0` | `/Users/omprakashprajapat/.nvm/versions/node/v22.23.2/bin/command-code` (`cmd`) | **Installed and verified**. Supports native MCP (`cmd mcp`), terminal TUI, and slash commands |
| **Terminal Harness 2** | Pi (`pi.dev`) | `not found` | **Absent from PATH and global npm packages**. Documented as a known gap; requires separate installation approval |

> [!NOTE]
> In accordance with Phase 0 rules, no missing software was installed, and no credentials or external services were accessed.

---

## 2. T02: Integration Capabilities Matrix

| Integration Dimension | Google Antigravity | Command Code (`1.84.0`) | Pi (`pi.dev`) |
| :--- | :--- | :--- | :--- |
| **MCP Integration** | **Native first-class client**. Can load stdio MCP servers directly. | **Native stdio MCP support**. Configured via `cmd mcp add --transport stdio <name> -- <command>`. | Supported via custom TypeScript extensions or MCP stdio wrapper bridges. |
| **CLI / Direct Tooling** | Run commands sandboxed in workspace via `run_command`. | Direct CLI execution (`cmd`), non-interactive query (`cmd -p`), interactive terminal. | Direct terminal execution (`pi`), built-in `bash` tool, RPC server mode. |
| **Project Guidance** | Project rules, instructions, custom skills, and slash commands. | `AGENTS.md` initialized via `/init`; `/import` from existing agent configurations. | System prompts, prompt templates, and custom skill configurations. |
| **Session Model** | Multi-turn conversation with artifact tracking and subagent trees. | Turn-based session with `/resume`, `/fork`, `/tree`, and `/compact`. | Minimal tree-structured sessions (`/tree`, `/fork`, `/clone`). |
| **Verification State** | **Locally observed & verified**. | **Locally observed & verified** (`v1.84.0`). | **Documented only** (Binary absent locally). |

### Key Architectural Finding
Both **Antigravity** and **Command Code** support standard **Model Context Protocol (MCP)** over `stdio`. This allows VectorForce to expose a single, shared MCP server:
```bash
cmd mcp add --transport stdio vectorforce -- node /path/to/vectorforce/bin/vf.js mcp
```
When invoked, both harnesses receive identical tool schemas (`save_checkpoint`, `resume_task`, `list_tasks`, `export_handoff`, `import_handoff`) with structured parameter validation and policy boundaries.

---

## 3. T03: Primary Journey and Data Scope Confirmation

### Primary Evaluation Journey
1. **Persona & Scope:** Single developer working locally on macOS in a single repository (`VectorForce`).
2. **Step 1 (Antigravity):** The developer starts a task in Antigravity (e.g. "Implement SQLite Checkpoint Store"). Antigravity calls the VectorForce MCP tool `save_checkpoint` to record goal, constraints, decisions, and permitted Git/doc evidence.
3. **Step 2 (Harness Switch):** The developer switches to the terminal and starts Command Code (`cmd`).
4. **Step 3 (Resume in Command Code):** Command Code invokes `resume_task` with the task identifier.
5. **Step 4 (Bounded Briefing):** VectorForce returns a policy-checked briefing containing:
   - Task goal, explicit constraints, approved architectural decisions, and next steps.
   - Workspace drift analysis (comparing current Git commit/dirty status to checkpoint time).
   - Warnings on any missing or unverified claims.
   - No uncontrolled dump of source files or entire conversations.
6. **Step 5 (Update & Reverse Switch):** Command Code completes an increment and records a new checkpoint. Antigravity subsequently calls `resume_task` and receives the updated context seamlessly.

### Data Scope & Boundary
- **Synthetic Task Fixtures:** Initial test cycles will use synthetic engineering tasks and mock commit states.
- **Allowed Documents:** Maximum of 8 explicit paths, restricted to `.md` or `.txt`, maximum 8 KiB per file, total 64 KiB.
- **Restricted Sources:** No arbitrary filesystem reading, no secret scanning bypass, and no network exfiltration.
- **Deferred:** Multi-developer handoff packages ([ADR-006](../decisions/adr-006-handoff-packages-and-context-reconciliation.md)) remain the next evaluation increment after local switching is proven.

---

## 4. T04: Evaluation Rubric and Baseline

To determine whether VectorForce outperforms raw manual developer notes without compromising safety, the prototype will be evaluated against a **Structured Handoff Note Baseline** (a standardized Markdown summary + Git log).

### Evaluation Metrics

| Metric | Target / Threshold | Evaluation Method |
| :--- | :--- | :--- |
| **Meaning Preservation** | **100%** critical constraints preserved | Verify that all explicit architectural constraints and non-goals are present in the resume briefing without distortion. |
| **Decision Distinction** | **0** unverified claims labeled as facts | Assert that assistant-generated assertions are tagged as claims, whereas Git commit hashes and file byte hashes are verified evidence. |
| **Drift Detection Accuracy** | **100%** uncommitted / branch changes detected | Verify that workspace changes made between checkpoint and resume trigger explicit drift warnings. |
| **Resume Generation Latency**| **< 500 ms** for briefing creation | Measure execution time of local SQLite query + briefing synthesis. |
| **Safety & Leak Prevention** | **0** unauthorized disclosures | Test that paths outside the allowlist or exceeding byte budgets are rejected and produce visible gaps, not raw content. |
| **Crash & Retry Idempotency**| **100%** identical receipts on retry | Verify that resubmitting an identical operation ID returns the committed reference without duplicating history. |

### Baseline Comparison Criteria
1. **Time to First Productive Action:** Compare time required for the receiving agent to output correct code when given VectorForce resume vs when given an empty prompt or raw chat export.
2. **Correction Overhead:** Number of corrective prompts required to steer the receiving agent back to the agreed architecture.
