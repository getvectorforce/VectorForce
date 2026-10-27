# Phase 2 Deliverable: Local Vertical Slice Implementation and Milestone M1

- **Date:** 2026-10-17
- **Status:** Complete (Milestone M1 Achieved)
- **Scope:** Tasks T10, T11, T12, T13, T14, and T15 from [MVP Task Breakdown](mvp-task-breakdown.md)
- **Reference ADRs:** [ADR-002](../decisions/adr-002-local-first-checkpoints-and-disclosure-boundaries.md), [ADR-003](../decisions/adr-003-portable-checkpoints-and-cross-harness-resume.md), [ADR-010](../decisions/adr-010-local-prototype-foundation.md), [ADR-011](../decisions/adr-011-explicit-document-collection.md), and [ADR-012](../decisions/adr-012-target-harness-selection-antigravity-commandcode-pidev.md)

---

## 1. Executive Summary & Milestone M1 Verification

Following explicit Gate G1 authorization, **Phase 2 (Tasks T10–T15)** has been implemented and validated against the agreed architecture and security boundaries.

### Milestone M1 Criteria:
> *"A manual CLI checkpoint/resume works on synthetic inputs without relying on an assistant to discover or invoke it. Recovery and authorization tests pass for this slice."*

**Outcome:** **Achieved**. All 26 automated unit and end-to-end integration tests execute deterministically via Node's native test runner (`node --test`), passing with 0 failures and 0 external npm runtime dependencies.

---

## 2. Implemented Architecture & Component Directory

```
VectorForce/
├── bin/
│   └── vf.js                     # Universal CLI entry point (M1)
├── src/
│   ├── index.js                  # Module export barrel
│   ├── core/
│   │   ├── errors.js             # Standardized error codes and VectorForceError
│   │   ├── hash.js               # SHA-256 and JSON canonicalization
│   │   └── types.js              # Schema validators for CheckpointRecordV1 & ReceiptV1
│   ├── storage/
│   │   └── sqlite-store.js       # Native node:sqlite storage with WAL & atomic commits
│   ├── policy/
│   │   └── authorizer.js         # Path traversal defense, allowlist checks, destination gating
│   ├── providers/
│   │   ├── git-provider.js       # Non-destructive, read-only Git metadata collector
│   │   └── document-provider.js  # Bounded, allowlisted document collector with provenance
│   └── operations/
│       ├── project-service.js    # Workspace canonicalization & unambiguous task routing (T11)
│       ├── checkpoint-service.js # Atomic checkpoint commit & idempotent deduplication (T12, T13)
│       └── briefing-service.js   # Bounded resume briefings with drift detection (T15)
└── test/
    ├── helpers/
    │   └── fixtures.js           # Isolated temporary workspace and database fixtures
    ├── schemas.test.js           # Checkpoint and receipt format tests
    ├── project-task.test.js      # T11 project/task binding and ambiguity prevention tests
    ├── checkpoint-store.test.js  # T12 atomicity, retry deduplication, and parent lineage tests
    ├── policy.test.js            # T13 path traversal, symlink, and receipt safety tests
    ├── providers.test.js         # T14 Git/document bounds, gaps, and UTF-8 verification tests
    ├── briefing-drift.test.js    # T15 claims/evidence briefing and drift detection tests
    └── cli.test.js               # Full end-to-end CLI workflow tests (Milestone M1)
```

---

## 3. Implementation Details by Task

### 3.1 T10: Approved Project and Test Foundation
- **Zero-Dependency Runtime:** Built using Node.js `v22.23.2` native modules (`node:sqlite`, `node:crypto`, `node:fs`, `node:path`, `node:child_process`, `node:test`, `node:assert`). No `node_modules` required for execution.
- **Git Repository Initialized:** Local repository initialized cleanly with `.gitignore` excluding temporary files and runtime databases.

### 3.2 T11: Project, Task, and Session Bindings
- **Canonical Workspace Binding:** Projects bind to `realpathSync(workspacePath)`. Reinitialization is idempotent and returns the existing project UUID (`proj-<hash>`).
- **Unambiguous Task Selection:** If a workspace contains multiple active tasks, operations requiring task context fail immediately with `AMBIGUOUS_TASK_SELECTION` unless an explicit `--task <id>` is provided. The system never guesses.

### 3.3 T12: Checkpoint History and Atomic Receipts
- **Atomic Commits:** Checkpoint insertion, task timestamp update, and operation receipt persistence execute inside `BEGIN IMMEDIATE ... COMMIT;`.
- **Idempotent Replay:** Every request is canonicalized and hashed using SHA-256. Subsequent identical requests return the committed receipt without creating duplicate rows or advancing task timestamps.
- **Parent Lineage:** Checkpoints must either have `parent_id: null` (initial task state) or reference an existing checkpoint in the exact same task. Cross-task parent references are rejected with `CROSS_TASK_PARENT_FORBIDDEN`.
- **Divergent Heads:** Multiple leaf checkpoints are detected. Resume requests without an explicit `--checkpoint <id>` fail safely with `DIVERGENT_HEADS` and list available candidate heads.

### 3.4 T13: Runtime Policy and Safe Receipts
- **Path Traversal Defense:** Forward-slash relative paths required. All `..` segments, leading slashes, Windows backslashes, and symlinks are rejected. Realpath containment verifies target physical path remains inside the canonical workspace.
- **Safe Receipt Invariant:** Operation receipts returned on stdout/MCP return only metadata (`operation_id`, `status`, `reference_id`, `request_hash`, `timestamp`, `warnings`). Full document contents and briefing bodies are never echoed in receipts.
- **Destination Gating:** Briefing requests check the consuming harness. Approved destinations: `antigravity`, `command-code`, `pi`, `cli`.

### 3.5 T14: Bundled Git and Document Providers
- **Git Provider:** Executes read-only `git rev-parse HEAD`, `git symbolic-ref --short HEAD`, and `git status --porcelain` with strict 3-second timeouts. If the directory is not a Git repo, it records an explicit evidence gap rather than failing.
- **Document Provider:** Only reads files explicitly registered in the project's exact allowlist (`document_policies`). Enforces an 8 KiB per-file cap and 64 KiB total cap. Validates UTF-8 and rejects NUL bytes (`0x00`). Records deterministic SHA-256 and tags content with `untrusted_content: true`.

### 3.6 T15: Bounded Context and Resume Briefings
- **Claims vs. Evidence Separation:** Formats distinct markdown sections clearly distinguishing model-reported claims (goals, constraints, decisions) from host-verified evidence (Git commits, document states).
- **Automated Workspace Drift Detection:**
  - Compares recorded Git commit SHA and dirty state against current workspace.
  - Compares recorded document SHA-256 against current file contents on disk.
  - Surfaces explicit drift warnings (`DRIFT DETECTED`) if files or commits shifted since checkpoint.

---

## 4. Test Verification Results

All 26 automated tests passed:
```text
✔ T15 Briefing: Formats claims and evidence with distinct sections (111ms)
✔ T15 Briefing: Detects document drift when file content is modified (61ms)
✔ T15 Briefing: Divergent heads error requires explicit checkpoint ID (14ms)
✔ T12 Checkpoint: Atomic capture commits checkpoint and receipt (34ms)
✔ T12 Checkpoint: Idempotent replay returns original receipt without duplicate rows (19ms)
✔ T12 Checkpoint: Parent chain links properly across consecutive steps (17ms)
✔ T12 Checkpoint: Rejects invalid or cross-task parent checkpoint (16ms)
✔ Milestone M1: End-to-end CLI workflow (1562ms)
✔ T13 Policy: Rejects path traversal with .. segments (31ms)
✔ T13 Policy: Rejects disallowed file extensions (11ms)
✔ T13 Policy: Rejects symbolic links (17ms)
✔ T13 Policy: Enforces exact allowlist for document capture (20ms)
✔ T13 Policy: Receipt safety - receipt never contains document content (21ms)
✔ T13 Policy: Destination harness authorization (1ms)
✔ T11 Project: Idempotent initialization returns existing identity (37ms)
✔ T11 Task: Task creation and listing (15ms)
✔ T11 Task: Ambiguous task resolution refuses to guess without explicit task ID (16ms)
✔ T14 Provider: DocumentProvider successfully collects valid document (28ms)
✔ T14 Provider: DocumentProvider records explicit gap when allowlisted file is missing (10ms)
✔ T14 Provider: DocumentProvider rejects oversized document (>8 KiB) (16ms)
✔ T14 Provider: DocumentProvider rejects binary file containing NUL bytes (13ms)
✔ T14 Provider: GitProvider returns metadata or records clean gap (64ms)
✔ Schema Validator: Valid checkpoint passes validation (15ms)
✔ Schema Validator: Rejects invalid schema_version (2ms)
✔ Schema Validator: Rejects invalid task_id syntax (1ms)
✔ Schema Validator: Valid receipt passes validation (1ms)
ℹ tests 26 | suites 0 | pass 26 | fail 0 | cancelled 0 | skipped 0 | duration_ms 1768
```

---

## 5. Next Steps: Phase 3 (Antigravity & Command Code Integration)

With Milestone M1 achieved, the project transitions to **Phase 3: Connect Antigravity And Command Code / Pi.dev** (Tasks T16–T19):
- **T16:** Reversible project initialization and MCP configuration.
- **T17:** Stdio MCP server implementation for **Google Antigravity** integration.
- **T18:** Stdio MCP configuration and CLI bridge for **Command Code** (`cmd mcp add`).
- **Milestone M2:** End-to-end synthetic task handover: checkpoint in Antigravity, resume in Command Code, and vice-versa.
