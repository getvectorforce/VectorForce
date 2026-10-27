# ADR-010: Local Prototype Foundation

- **Date:** 2026-10-15
- **Status:** Initial synthetic-data prototype implemented; broader security/design review pending
- **Scope:** Implementation foundation, actual behavior, and verification limits
- **[Decision index](../README.md)**
- **Related:** [MVP scope (ADR-008)](adr-008-mvp-boundary-and-architecture-validation.md), [Harness pair (ADR-009)](adr-009-copilot-and-pi-evaluation-pair.md), and [Task plan](../planning/mvp-task-breakdown.md)

## Authorization And Readiness

The developer requested implementation to begin and separately approved a user-local Node.js installation without administrator privileges. This authorizes the local foundation work recorded here, not automatic installation of Pi, model-provider login, real-project collection, organization deployment, or adoption of every earlier proposal.

Observed readiness: Windows, Git 2.53.0.windows.1, VS Code 1.102.0 x64. Node, npm, and Pi were not found on PATH; Copilot extension discovery did not yield a version, so its exact local configuration remains unverified. A usable .NET SDK was established; the discovered Python command was a WindowsApps alias, not a verified interpreter.

Node.js v24.22.0 was selected from the official release index. Pi's Windows x64 archive checked against the published SHA-256 checksum, and unpacked under `%LOCALAPPDATA%\BlueProject\runtime`. This is transport integrity checking against the published checksum, not an independent publisher-signature verification. No system PATH modification or Pi installation was performed.

## Implementation Choices

- Use dependency-free JavaScript modules on Node.js 24+, with the built-in test runner and SQLite API. This minimizes bootstrap dependencies and aligns with the runtime used by Pi's extension ecosystem without coupling the portable protocol to Pi.
- Use one local SQLite database for project/task bindings, immutable checkpoint records, and operation receipts. A checkpoint and its deduplication identity are persisted in one transaction. Version 1 is the initial store/protocol format; incompatible store or request versions fail rather than being silently accepted.
- The command surface is `init`, `task`, `checkpoint`, and `local-only`. A PowerShell launcher discovers the approved user-local Node installation without installing software or weakening execution policy. There is no service, listener, watcher, or autonomous operation.

## Implemented Semantics

- Projects bind to explicit canonical workspace paths; tasks are explicitly project-scoped. Reinitializing the same binding returns its existing identity.
- Checkpoints require explicit task and operation identities, validate bounded structured claims, and reject unknown fields.
- Reusing an operation ID with identical normalized content returns the original checkpoint. Different content under that ID is rejected without changing history.
- Parent links must stay within the same task. Divergent heads are preserved; automatic resume fails with needs-selection until a specific checkpoint is chosen.
- Git collection is off by default. Opt-in collection reads the commit and a tracked-change boolean, with timeout/output limits and disabled filesystem-monitor/hooks configuration for those commands. No network fetch or source/diff collection is performed.
- Resume remains an evidence gap. Verification task is stored as harness-reported state, never automatically human-approved or independently verified.
- Resume writes a bounded local briefing containing warnings and returns its location, not its body. It does not grant model-consumption or publication permission.

## Security And Scope Limits

- This is a trusted-local-user prototype, not a secure multi-user service or enterprise DLP boundary. No authoritative actor identity, destination binding, developer-controlled disclosure approval, plugin sandbox, encrypted storage, Windows ACL provisioning, managed policy, retention/removal workflow, or signed package distribution has been implemented.
- The default store is under local application data rather than the OneDrive workspace. Storage override and denied redirection still require review. Database and briefing files are plaintext. Store containment is checked during project binding; the construction may already have created an empty database before rejecting a binding. No collection occurred in the actual product workspace during testing.
- Document providers, bounded destination-approved consumption, automatic workspace-drift comparison, version bindings, handoff/export/import, and Copilot/Pi integrations remain incomplete. There is no final product security review or evidence that the full G1 dossier or any release gate has been satisfied. Real-project pilots remain separately gated.

## Verification Evidence

- The built-in test runner completed 18 tests with no failures or skips on this machine. Coverage includes project idempotency, atomic retry behavior, rollback after invalid parents, task boundaries, divergent heads, local-only briefing receipts, reopen persistence, structured input, explicit Git gaps, and an empty synthetic Git repository.
- A separate PowerShell launcher smoke test passed initialization, task creation, piped checkpoint JSON, and local resume generation. Both test paths used temporary synthetic workspaces/stores and cleaned up their own generated data.
- Tests verify the initial local slice only. They do not establish concurrent multi-process recovery under all failures, privacy certification, model invocation reliability, useful cross-harness resume, or superiority to a structured note.

## Next Steps

Complete the security/approval design before exposing content bodies to a harness. Implement selected-document collection with explicit scope, add current state drift checks and lifecycle docs retrieval, then integrate explicit Copilot/Pi invocation after prerequisites and destination controls are verified. Do not enable automatic hooks merely because the local CLI works.
