# Phase 1 Deliverable: Architecture Decisions, Schemas, and Security Contracts

- **Date:** 2026-10-17
- **Status:** Complete (Ready for Gate G1 Review)
- **Scope:** Tasks T05, T06, T07, T08, and T09 from [MVP Task Breakdown](mvp-task-breakdown.md)
- **Reference ADRs:** [ADR-001](../decisions/adr-001-event-driven-harness-independent-context-architecture.md), [ADR-002](../decisions/adr-002-local-first-checkpoints-and-disclosure-boundaries.md), [ADR-003](../decisions/adr-003-portable-checkpoints-and-cross-harness-resume.md), [ADR-005](../decisions/adr-005-project-task-and-workspace-identity.md), [ADR-010](../decisions/adr-010-local-prototype-foundation.md), [ADR-011](../decisions/adr-011-explicit-document-collection.md), and [ADR-012](../decisions/adr-012-target-harness-selection-antigravity-commandcode-pidev.md)

---

## 1. T05: Minimal Portable Records and Protocol Specification

### 1.1 Architectural Principle: Claims vs. Evidence

VectorForce maintains a strict epistemological separation between **Claims** and **Evidence**:
- **Claims (Model / Human Assertions):** Statements of intent, goals, constraints, architectural decisions, and proposed next steps. These are subjective representations of cognitive state and are stamped as `unverified_claim`.
- **Evidence (Deterministic Host Observations):** Objective, cryptographic, and verifiable host facts: Git commit SHA, branch name, dirty state boolean, exact-byte SHA-256 hashes of allowlisted documents, and command exit codes.

A resume briefing must never present a model claim as an established fact, nor present an unverified document as ground truth.

---

### 1.2 Checkpoint Record Schema (`vectorforce/checkpoint/v1`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vectorforce.dev/schemas/checkpoint-v1.json",
  "title": "CheckpointRecordV1",
  "type": "object",
  "required": [
    "schema_version",
    "checkpoint_id",
    "project_id",
    "task_id",
    "parent_id",
    "timestamp",
    "author",
    "summary",
    "claims",
    "evidence",
    "metadata"
  ],
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "vectorforce/checkpoint/v1"
    },
    "checkpoint_id": {
      "type": "string",
      "format": "uuid"
    },
    "project_id": {
      "type": "string",
      "pattern": "^proj-[a-f0-9]{12,64}$"
    },
    "task_id": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-_]{1,63}$"
    },
    "parent_id": {
      "type": ["string", "null"],
      "format": "uuid"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "author": {
      "type": "object",
      "required": ["name", "harness"],
      "additionalProperties": false,
      "properties": {
        "name": { "type": "string", "maxLength": 100 },
        "harness": {
          "type": "string",
          "enum": ["antigravity", "command-code", "pi", "cli", "human"]
        }
      }
    },
    "summary": {
      "type": "string",
      "minLength": 5,
      "maxLength": 1000
    },
    "claims": {
      "type": "object",
      "required": ["goals", "constraints", "decisions", "next_steps", "open_questions"],
      "additionalProperties": false,
      "properties": {
        "goals": {
          "type": "array",
          "items": { "type": "string", "maxLength": 500 },
          "maxItems": 20
        },
        "constraints": {
          "type": "array",
          "items": { "type": "string", "maxLength": 500 },
          "maxItems": 30
        },
        "decisions": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "title", "rationale"],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string", "pattern": "^[A-Z0-9_-]{2,32}$" },
              "title": { "type": "string", "maxLength": 200 },
              "rationale": { "type": "string", "maxLength": 1000 }
            }
          },
          "maxItems": 30
        },
        "next_steps": {
          "type": "array",
          "items": { "type": "string", "maxLength": 500 },
          "maxItems": 20
        },
        "open_questions": {
          "type": "array",
          "items": { "type": "string", "maxLength": 500 },
          "maxItems": 20
        }
      }
    },
    "evidence": {
      "type": "object",
      "required": ["git", "documents", "gaps"],
      "additionalProperties": false,
      "properties": {
        "git": {
          "type": ["object", "null"],
          "required": ["commit_hash", "branch", "is_dirty", "collected_at"],
          "additionalProperties": false,
          "properties": {
            "commit_hash": { "type": "string", "pattern": "^[a-f0-9]{40}$" },
            "branch": { "type": "string", "maxLength": 200 },
            "is_dirty": { "type": "boolean" },
            "collected_at": { "type": "string", "format": "date-time" }
          }
        },
        "documents": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["path", "sha256", "size_bytes", "collected_at", "untrusted_content"],
            "additionalProperties": false,
            "properties": {
              "path": { "type": "string", "pattern": "^[a-zA-Z0-9_./-]+$" },
              "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
              "size_bytes": { "type": "integer", "minimum": 0, "maximum": 8192 },
              "collected_at": { "type": "string", "format": "date-time" },
              "untrusted_content": { "type": "boolean", "const": true }
            }
          },
          "maxItems": 8
        },
        "gaps": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["type", "target", "reason"],
            "additionalProperties": false,
            "properties": {
              "type": { "type": "string", "enum": ["git", "document", "test"] },
              "target": { "type": "string" },
              "reason": { "type": "string" }
            }
          }
        }
      }
    },
    "metadata": {
      "type": "object",
      "additionalProperties": { "type": "string", "maxLength": 256 }
    }
  }
}
```

---

### 1.3 Operation Receipt Schema (`vectorforce/receipt/v1`)

Every command or tool invocation returns a deterministic, safe operation receipt. **Receipts never embed briefing bodies, document contents, or private source code.**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vectorforce.dev/schemas/receipt-v1.json",
  "title": "OperationReceiptV1",
  "type": "object",
  "required": [
    "schema_version",
    "operation_id",
    "operation_type",
    "status",
    "timestamp",
    "request_hash",
    "warnings",
    "errors"
  ],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "type": "string", "const": "vectorforce/receipt/v1" },
    "operation_id": { "type": "string", "format": "uuid" },
    "operation_type": {
      "type": "string",
      "enum": ["checkpoint", "resume", "task_init", "policy_update", "export", "import"]
    },
    "status": {
      "type": "string",
      "enum": ["committed", "idempotent_replay", "rejected", "needs_selection", "denied"]
    },
    "reference_id": { "type": ["string", "null"] },
    "timestamp": { "type": "string", "format": "date-time" },
    "request_hash": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "warnings": { "type": "array", "items": { "type": "string" } },
    "errors": { "type": "array", "items": { "type": "string" } },
    "briefing_path": { "type": ["string", "null"] }
  }
}
```

---

### 1.4 Model Context Protocol (MCP) Tool Signatures

VectorForce exposes a stdio-based MCP server providing the following exact tools:

#### 1. `save_checkpoint`
```json
{
  "name": "save_checkpoint",
  "description": "Capture an immutable, policy-bounded checkpoint of the current engineering task.",
  "parameters": {
    "type": "object",
    "required": ["task_id", "summary", "goals", "constraints"],
    "properties": {
      "task_id": { "type": "string", "description": "Kebab-case task slug" },
      "summary": { "type": "string", "description": "Concise summary of progress and current state" },
      "goals": { "type": "array", "items": { "type": "string" }, "description": "Active objectives" },
      "constraints": { "type": "array", "items": { "type": "string" }, "description": "Non-negotiable architectural invariants" },
      "decisions": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["id", "title", "rationale"],
          "properties": {
            "id": { "type": "string" },
            "title": { "type": "string" },
            "rationale": { "type": "string" }
          }
        },
        "description": "Key architectural choices made during this step"
      },
      "next_steps": { "type": "array", "items": { "type": "string" }, "description": "Immediate upcoming tasks" },
      "open_questions": { "type": "array", "items": { "type": "string" } },
      "include_git": { "type": "boolean", "default": true },
      "requested_documents": { "type": "array", "items": { "type": "string" }, "description": "Allowlisted relative document paths" }
    }
  }
}
```

#### 2. `get_resume_briefing`
```json
{
  "name": "get_resume_briefing",
  "description": "Retrieve an authorized, bounded resume briefing for a specific task and checkpoint.",
  "parameters": {
    "type": "object",
    "required": ["task_id"],
    "properties": {
      "task_id": { "type": "string" },
      "checkpoint_id": { "type": "string", "description": "Optional specific checkpoint ID. Defaults to latest head." },
      "max_tokens": { "type": "integer", "default": 4000, "maximum": 8000 },
      "destination_harness": { "type": "string", "enum": ["antigravity", "command-code", "pi", "cli"] }
    }
  }
}
```

#### 3. `list_tasks`
```json
{
  "name": "list_tasks",
  "description": "List engineering tasks registered in the active workspace.",
  "parameters": {
    "type": "object",
    "properties": {
      "status": { "type": "string", "enum": ["active", "completed", "abandoned", "all"], "default": "active" }
    }
  }
}
```

#### 4. `check_workspace_drift`
```json
{
  "name": "check_workspace_drift",
  "description": "Compare current workspace Git state and document hashes against the last recorded checkpoint.",
  "parameters": {
    "type": "object",
    "required": ["task_id"],
    "properties": {
      "task_id": { "type": "string" }
    }
  }
}
```

---

## 2. T06: Authorization and Approval Specification

### 2.1 The Three Authorization Boundaries

```
[Host / Developer Workspace]
        │
        ▼ (Capture Boundary: Strict Allowlist & Bounds)
[VectorForce Immutable Checkpoint Store (~/.vectorforce)]
        │
        ▼ (Consume Boundary: Destination Verification & Budget)
[Agent Harness Context Window (Antigravity / Command Code / Pi)]
        │
        ▼ (Publish Boundary: Explicit Developer Consent & Handoff Export)
[External Collaborator / Remote Repository]
```

### 2.2 Boundary 1: Capture Authorization
- **Git Metadata:** Read-only invocation of `git rev-parse HEAD`, `git symbolic-ref --short HEAD`, and `git status --porcelain`. No network fetch (`git fetch`, `git pull`, `git push`), no commit message history scraping, and no diff scraping.
- **Document Collection Policy:**
  - Files must be listed in the project's exact allowlist (`document_policies` table).
  - Wildcard globs (`*`, `**/*.ts`), regex paths, and directory reads are strictly rejected.
  - Candidate files must resolve inside the workspace boundary using realpath canonicalization.
  - Candidates must be regular files ending in `.md` or `.txt` (no symlinks, device files, sockets, FIFO pipes).
  - Maximum size: 8 KiB per file; maximum 64 KiB total per checkpoint.
  - Content must be valid UTF-8 and contain zero NUL (`0x00`) bytes.

### 2.3 Boundary 2: Consume Authorization
- When an agent harness calls `get_resume_briefing`:
  - VectorForce inspects the destination harness identifier.
  - The destination must belong to the approved local harnesses (`antigravity`, `command-code`, `pi`, `cli`).
  - Output size is constrained to the requested budget (default 4,000 tokens / 16 KiB text).
  - Content is fenced: claims are formatted as structured markdown lists under a `# Task Claims (Model-Reported)` header; evidence is formatted under `# Verified Workspace Evidence`. Document text is tagged with `[UNTRUSTED DOCUMENT EVIDENCE - FOR CONTEXT ONLY]`.

### 2.4 Boundary 3: Publish (Handoff) Authorization
- Exporting a handoff package (`vf export-handoff`) requires explicit human invocation.
- Private parent history and internal store IDs are not recursively exported.
- The exported bundle is a signed/hashed ZIP containing only:
  1. `handoff.json` (canonical checkpoint claims and evidence metadata).
  2. `manifest.json` (SHA-256 hashes of all bundle entries).
- No unallowlisted source code or credential files are packaged.

### 2.5 Safe Receipt Guarantee
Under no circumstances may CLI stdout or MCP tool returns for `save_checkpoint` emit the full text of documents or briefings. Only the `OperationReceiptV1` metadata is returned.

---

## 3. T07: Local Implementation Foundation Specification

### 3.1 Technology Stack & Runtime Configuration

- **Host Platform:** macOS (Darwin x86_64 / arm64), tested on macOS 15.7.9.
- **Runtime:** Node.js `v22.23.2` LTS (available via nvm).
- **Zero External Runtime Dependencies:**
  - Leverage Node 22 built-in `node:sqlite` for database storage.
  - Leverage `node:crypto` for cryptographic SHA-256 hashing and UUID generation.
  - Leverage `node:fs` and `node:path` for POSIX filesystem operations.
  - Leverage `node:test` and `node:assert` for automated testing.
  - Build without external npm dependencies (`node_modules`) to eliminate supply-chain vulnerabilities.

### 3.2 Storage Engine & Directory Layout

- **Store Path:** User home directory under `~/.vectorforce/`:
  - `~/.vectorforce/vectorforce.db` (SQLite primary database).
  - `~/.vectorforce/briefings/` (temporary generated briefing files).
  - `~/.vectorforce/handoffs/` (exported handoff bundles).
- **File Permissions:**
  - Directory: `0700` (`rwx------`)
  - Database file: `0600` (`rw-------`)
  - Avoids putting runtime databases in workspace trees or cloud-synced folders (e.g. iCloud, Dropbox).

### 3.3 SQLite Database Schema (DDL)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA user_version = 1;

-- Projects table (mapped by canonical workspace path)
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  canonical_path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'abandoned')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, task_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- Checkpoints table (immutable append-only history)
CREATE TABLE IF NOT EXISTS checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  parent_id TEXT,
  timestamp TEXT NOT NULL,
  author_json TEXT NOT NULL,
  summary TEXT NOT NULL,
  claims_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY (project_id, task_id) REFERENCES tasks(project_id, task_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES checkpoints(checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_task ON checkpoints(project_id, task_id, timestamp);

-- Operations table (for atomic idempotency & deduplication)
CREATE TABLE IF NOT EXISTS operations (
  operation_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL,
  warnings_json TEXT NOT NULL,
  errors_json TEXT NOT NULL,
  UNIQUE(project_id, task_id, request_hash)
);

-- Document collection policies
CREATE TABLE IF NOT EXISTS document_policies (
  project_id TEXT PRIMARY KEY,
  allowed_paths_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);
```

### 3.4 Transactional Atomicity & Crash Recovery

1. **Atomic Commits:** Checkpoint persistence runs inside a single `BEGIN IMMEDIATE ... COMMIT` block. If Git collection or document reading encounters an unrecoverable disk error, the entire transaction rolls back.
2. **Idempotent Replay:** Before processing, the request payload is canonicalized (keys sorted, whitespace trimmed) and hashed with SHA-256. If `(project_id, task_id, request_hash)` exists in `operations`, the transaction returns the previously committed receipt immediately without appending duplicate history.
3. **Parent Link Integrity:** `parent_id` must either be `NULL` (initial checkpoint) or reference an existing checkpoint belonging to the exact same `(project_id, task_id)`. Cross-task parent links are rejected.
4. **Divergent Heads:** If multiple checkpoints share the same parent or multiple leaf checkpoints exist without a single head, resume requests fail with `status: "needs_selection"`, requiring the developer or agent to explicitly specify `checkpoint_id`.

---

## 4. T08: Threat Model and Trust Boundary Review

### 4.1 Assets and Trust Domains

| Domain | Entity | Trust Level | Capabilities / Bounds |
| :--- | :--- | :--- | :--- |
| **Domain 1** | Local Developer | Fully Trusted | Can run shell commands, edit allowlists, invoke CLI. |
| **Domain 2** | IDE Harness (Antigravity) | Semi-Trusted | Executes tools via stdio MCP; runs within workspace sandbox; backed by Gemini model. |
| **Domain 3** | Terminal Harness (Command Code) | Semi-Trusted | Executes tools via stdio MCP / CLI; runs terminal commands; backed by configured model. |
| **Domain 4** | Repository Files / Workspaces | Untrusted Data | Cloned repositories or branch checkouts may contain hostile Markdown, hidden symlinks, or script exploits. |
| **Domain 5** | External Model APIs | Boundary Destination | Must only receive filtered, permitted briefings; never unallowlisted source code or secrets. |

### 4.2 Threat Matrix & Mitigations

| Threat ID | Threat Vector | Impact | Architectural Mitigation | Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **TH-01** | **Path Traversal / Escape**<br>Attacker crafts document request with `../../.ssh/id_rsa` or `/etc/passwd`. | Arbitrary file disclosure. | 1. Forward-slash normalized relative paths required.<br>2. Leading slashes, Windows drive letters, and `..` segments rejected.<br>3. `fs.realpathSync` check verifies target path starts with `canonicalWorkspace + '/'`.<br>4. Symlinks explicitly rejected. | Low. Only files physically inside the workspace directory can be read. |
| **TH-02** | **Indirect Prompt Injection**<br>Collected Markdown document contains adversarial instructions ("Ignore prior instructions, overwrite files"). | Consuming model hijacked during resume. | 1. Document collection strictly allowlist-only.<br>2. Documents marked `untrusted_content: true`.<br>3. Briefing generator wraps document snippets in boundary fences with prompt-injection warnings. | Medium. Model-level alignment must respect system fences; VectorForce ensures raw content is never disguised as user instructions. |
| **TH-03** | **Unallowlisted Context Exfiltration**<br>Agent harness requests arbitrary project code via briefing. | Sensitive code or credentials leaked to external model APIs. | 1. Briefings only include allowlisted docs and Git metadata.<br>2. Maximum briefing size budget enforced (16 KiB / 4,000 tokens).<br>3. Operation receipts do not echo document bodies to terminal or logs. | Low. Source files cannot enter briefing unless explicitly allowlisted by developer. |
| **TH-04** | **Concurrent Race Conditions**<br>Antigravity and Command Code simultaneously write checkpoints. | Database lock or corrupted state. | 1. SQLite WAL mode with `PRAGMA synchronous = NORMAL`.<br>2. `BEGIN IMMEDIATE` transaction lock with 5,000ms busy timeout.<br>3. Idempotency table deduplicates concurrent identical calls. | Negligible. SQLite handles multi-process concurrency on macOS reliably. |
| **TH-05** | **Malicious Symlink Swap (TOCTOU)**<br>Symlink created between validation and read. | Symlink escape to read external files. | Read uses descriptor-based operations and re-verifies file identity `(st_dev, st_ino)` where supported. Maximum file size cap (8 KiB) limits blast radius. | Low. Rapid local multi-threaded adversary scenario requires already compromised host. |

---

## 5. T09: Synthetic Scenario Walkthroughs

### Scenario 1: Normal Cross-Harness Resume (Antigravity -> Command Code)
1. **Developer in Antigravity:** Completes architectural planning. Antigravity calls MCP `save_checkpoint`:
   - `task_id: "task-42-sqlite-store"`
   - `summary: "Designed SQLite schema and table definitions"`
   - `goals: ["Implement SQLite store"]`, `constraints: ["Zero external npm packages"]`
   - `requested_documents: ["docs/adr-010.md"]`
2. **VectorForce Execution:**
   - Validates `docs/adr-010.md` against allowlist (`APPROVED`).
   - Reads Git commit (`abc1234`), branch (`main`), dirty flag (`false`).
   - Inserts checkpoint and operation record atomically.
   - Returns `OperationReceiptV1` (`status: "committed"`, `checkpoint_id: "ck-101"`).
3. **Developer in Terminal:** Launches `cmd` (Command Code) and enters `/resume task-42-sqlite-store`.
4. **Command Code Execution:**
   - Calls MCP `get_resume_briefing(task_id: "task-42-sqlite-store")`.
   - VectorForce verifies Git state has not drifted (`abc1234` matches).
   - Briefing formatted with claims, decisions, and untrusted document excerpts.
   - Command Code resumes with identical context and zero lost constraints.

---

### Scenario 2: Duplicate / Idempotent Request
1. **Network or Agent Retry:** An agent triggers `save_checkpoint` twice due to a client timeout.
2. **VectorForce Execution:**
   - Canonicalizes JSON request payload and computes SHA-256 hash.
   - Queries `operations` table: finds matching `(project_id, task_id, request_hash)`.
   - Returns existing receipt with `status: "idempotent_replay"` and original `checkpoint_id`.
   - Database checkpoint count remains 1; no duplicate history created.

---

### Scenario 3: Ambiguous Task Routing
1. **Developer Invokes Resume:** Runs `vf resume` without specifying `--task` in a project with three active tasks.
2. **VectorForce Execution:**
   - Discovers multiple active tasks for the canonical workspace.
   - Refuses to guess or default to the most recent task.
   - Emits `OperationReceiptV1` with `status: "needs_selection"`, listing available task IDs.
   - Exit code non-zero; no briefing generated.

---

### Scenario 4: Missing or Modified Evidence (Document Drift)
1. **Developer Action:** Edits `docs/adr-010.md` after checkpoint `ck-101` was captured.
2. **Resume Invocation:** Command Code calls `check_workspace_drift`.
3. **VectorForce Execution:**
   - Re-computes SHA-256 of `docs/adr-010.md`.
   - Compares with hash stored in checkpoint evidence.
   - Returns drift warning: `DRIFT_DETECTED: Document docs/adr-010.md modified since checkpoint ck-101 (hash mismatch)`.
   - Briefing clearly highlights the evidence drift so the agent asks for clarification rather than assuming outdated specifications.

---

### Scenario 5: Denied Destination / Unallowlisted Path
1. **Agent Invocation:** Antigravity attempts to checkpoint with `requested_documents: ["../../.env"]`.
2. **VectorForce Execution:**
   - Path parser detects relative traversal `..`.
   - Operation rejected immediately with `status: "rejected"`, `errors: ["PATH_TRAVERSAL_DETECTED: Path must not contain '..' segments"]`.
   - Zero filesystem reads performed; transaction aborted.

---

### Scenario 6: Divergent Checkpoints (Forked History)
1. **Branching Work:** Two subagents checkpointed from the same parent `ck-101`, creating `ck-102a` and `ck-102b`.
2. **Resume Invocation:** Agent calls `get_resume_briefing(task_id: "task-42")` without specifying `checkpoint_id`.
3. **VectorForce Execution:**
   - Store detects two leaf heads for the task.
   - Returns `status: "needs_selection"`, listing both leaf checkpoint IDs with summaries and timestamps.
   - Forces explicit head selection; never arbitrarily picks one leaf over another.

---

## 6. Gate G1 Readiness Checklist

| Requirement | Evaluation Criterion | Status | Evidence |
| :--- | :--- | :--- | :--- |
| **1. Scope & ADR Acceptance** | Product Owner and Architect accept the bounded evaluation pair and MVP limits. | **Ready** | ADR-001 through ADR-012 documented and approved for evaluation in `wiki/decisions/`. |
| **2. Portable Schemas** | JSON Schema definitions for checkpoint, receipt, and MCP tools with claims/evidence separation. | **Ready** | Schemas specified in Section 1 (Draft 2020-12 compatible, typed claims vs evidence). |
| **3. Authorization Model** | Capture, consume, and publish checks specified with zero-leak receipts and exact path allowlists. | **Ready** | Three-boundary model specified in Section 2; safe receipts verified. |
| **4. Storage & Platform Locked** | macOS 15 host, Node 22 native modules, SQLite schema, zero external npm runtime dependencies. | **Ready** | DDL and engine layout specified in Section 3 (`~/.vectorforce`, WAL mode, 0700 permissions). |
| **5. Threat Model Reviewed** | Path traversal, prompt injection, context exfiltration, and race conditions addressed. | **Ready** | Threat matrix and mitigations documented in Section 4 (TH-01 through TH-05). |
| **6. Synthetic Scenarios Walked** | Normal resume, duplicate replay, ambiguous tasks, evidence drift, and divergent heads covered. | **Ready** | 6 walkthroughs documented in Section 5 with deterministic outcome rules. |

> [!IMPORTANT]
> **Gate G1 Decision:** All architectural decisions, schemas, authorization policies, storage definitions, threat models, and synthetic walkthroughs are closed. The project is fully prepared for **Gate G1 Approval** to commence **Phase 2 Implementation (T10–T15)**.
