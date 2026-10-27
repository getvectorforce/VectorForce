# Phase 4 Deliverable: Handoff & Safety Validation and Milestone M3

- **Date:** 2026-10-17
- **Status:** Complete (Milestone M3 Achieved)
- **Scope:** Tasks T20, T21, T22, and T23 from [MVP Task Breakdown](mvp-task-breakdown.md)
- **Reference ADRs:** [ADR-002](../decisions/adr-002-local-first-checkpoints-and-disclosure-boundaries.md), [ADR-003](../decisions/adr-003-portable-checkpoints-and-cross-harness-resume.md), [ADR-006](../decisions/adr-006-handoff-packages-and-context-reconciliation.md), and [ADR-008](../decisions/adr-008-mvp-boundary-and-architecture-validation.md)

---

## 1. Executive Summary & Milestone M3 Verification

In **Phase 4**, VectorForce implemented cross-developer and cross-workspace context transfer with explicit disclosure controls, safe offline packaging, adversarial threat validation, and context reconciliation:
- **Selective Handoff Preparation & Export (T20):** `vf export` produces bounded `handoff.json` and cryptographic `manifest.json` bundles. Private ancestor chains and local path structures are stripped; dry-run preview is enforced.
- **Safe Import & Explicit Reconciliation (T21):** `vf import` parses untrusted packages, verifies cryptographic SHA-256 integrity against the manifest, enforces file size caps (<2MB), and preserves parallel decision histories with attributed provenance rather than silent overwrite.
- **Security & Adversarial Testing (T22):** Dedicated test suite verifying rejection of path traversal (`..`), corrupted/tampered manifest digests, and malformed payloads.
- **End-to-End Evaluation Rubric Run (T23 / Milestone M3):** Completed full bidirectional handoff cycle across two isolated workspaces (Antigravity IDE <-> Command Code Terminal).

### Milestone M3 Verification Criteria:
> *"The bounded journey works end to end on the selected environment. No unresolved critical privacy, authorization, or data-loss failures remain."*

**Outcome:** **Achieved**. All 39 automated tests across 12 test suites pass with 0 failures (`npm test`). The end-to-end integration test (`test/m3-handoff-lifecycle.test.js`) executed the full cross-workspace lifecycle with:
- **100% Invariant Constraint Retention**
- **100% Decision Continuity & Attribution**
- **Zero Document Leakage Outside Project Allowlist**
- **Zero External Dependencies**

---

## 2. Handoff Package Specification

### 2.1 Bundle Architecture
Handoff packages are portable, single-file JSON envelopes (`vectorforce/handoff-bundle/v1`) containing:
1. **`manifest` (`vectorforce/manifest/v1`):** Cryptographic catalog containing SHA-256 hash digests and byte sizes of all package components.
2. **`handoff` (`vectorforce/handoff/v1`):** Bounded task view containing:
   - `origin`: Project name, task ID, title, and exported checkpoint ID.
   - `disclosure`: Intended recipient identity and destination harness constraints.
   - `checkpoint`: Concise summary, claims (goals, constraints, decisions, next steps), and verified evidence (Git metadata, allowlisted document contents and hashes).

### 2.2 Boundary Isolation Guarantees
Per [ADR-006](../decisions/adr-006-handoff-packages-and-context-reconciliation.md):
- **No Ancestor History Leak:** Private ancestors before the exported checkpoint are never serialized into the bundle.
- **No Internal Store ID Leak:** SQLite row IDs and local filesystem paths outside the workspace are stripped.
- **Safe Receipts:** Export and import operations return standard `OperationReceiptV1` metadata only; receipts never leak document bodies or briefing text.

---

## 3. CLI & MCP Tool Interface

### 3.1 CLI Commands (`bin/vf.js`)
```bash
# Preview handoff payload before exporting (dry-run)
vf export --task payment-gateway --recipient "teammate@company.com" --preview

# Export handoff bundle
vf export --task payment-gateway --recipient "teammate@company.com" --out ./handoff.json

# Import handoff bundle into active workspace
vf import ./handoff.json --task payment-gateway
```

### 3.2 MCP Tool Surface
Registered for Google Antigravity and Command Code via `vf mcp`:
- **`export_handoff`:** `task_id`, `recipient`, `checkpoint_id?`, `destination_harness?`, `preview?`, `out_path?`
- **`import_handoff`:** `bundle_path`, `target_task_id?`

---

## 4. Test Suite Summary

| Test Suite | Focus / Task | Tests | Status |
| :--- | :--- | :--- | :--- |
| `test/handoff.test.js` | T20 Export Preview, T21 Import & Context Reconciliation | 3 | **Pass** |
| `test/security-handoff.test.js` | T22 Path Traversal, Corrupted Hash Rejection, Malformed Bundles | 3 | **Pass** |
| `test/m3-handoff-lifecycle.test.js` | T23 / Milestone M3 Full Cross-Workspace Handoff Lifecycle | 1 | **Pass** |
| `test/m2-cross-harness.test.js` | Milestone M2 Cross-Harness Handover | 1 | **Pass** |
| `test/cli.test.js` | Milestone M1 CLI End-to-End | 1 | **Pass** |
| `test/mcp.test.js` | MCP Protocol Framing & Tool Execution | 5 | **Pass** |
| `test/policy.test.js` | Path Traversal & Allowlist Policy | 6 | **Pass** |
| `test/project-task.test.js` | Project & Task Canonicalization | 3 | **Pass** |
| `test/checkpoint-store.test.js`| Atomic SQLite Checkpoints & Lineage | 4 | **Pass** |
| `test/briefing-drift.test.js` | Bounded Briefings & Drift Detection | 3 | **Pass** |
| `test/providers.test.js` | Git & Document Providers | 5 | **Pass** |
| `test/schemas.test.js` | JSON Schema Validation | 4 | **Pass** |
| **Total** | **All 12 Test Suites** | **39** | **100% Pass** |
