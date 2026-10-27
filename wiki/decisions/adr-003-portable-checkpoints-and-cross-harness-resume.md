# ADR-003: Portable Checkpoints And Cross-Harness Resume

- **Date:** 2026-10-15
- **Status:** Proposed
- **Scope:** Context records, task identity, and resume semantics
- **[Decision index](../README.md)**

## Context

A developer should be able to checkpoint a task in one harness and continue in another without transferring an entire conversation or unnecessarily exposing source code. This journey was discussed as an architectural example; its detailed design has not yet been approved.

## Proposal

A checkpoint is a historical record. A resume briefing is a destination-specific, policy-filtered view of that record. Store checkpoints independently of harness-specific formats and render bounded briefings through adapters.

Use immutable checkpoints with parent links and mutable references as a conceptual model. This borrows Git's versioning approach without committing to Git as the underlying storage engine. Corrections should preserve provenance, while retention and deletion must remain possible under policy.

## Proposed Checkpoint Contents

| Area | Contents |
| :--- | :--- |
| **Identity and scope** | Stable project and task identities, session identity, repository, commit, branch, and relevant worktree state |
| **Engineering state** | Goal, constraints, decisions, rationale, alternatives, and unresolved questions |
| **Progress** | Completed work, blockers, next actions, and verification evidence |
| **Evidence** | Authorized references or excerpts from documents, issues, PRs, commits, and conversations |
| **Provenance** | Source identity and revision, collection time, producing provider, and applicable policy |
| **Disclosure** | Classification, audience restrictions, expiration, and redaction status |

Do not equate a task with a chat window. Multiple sessions and harnesses may contribute to the same task. Do not select context solely by recency; several tasks may be active at once.

## Cross-Harness Journey

1. Harness A submits intent, decisions, progress, blockers, and next steps at a checkpoint.
2. Blue Project collects permitted evidence and saves the local record, marking unavailable sources and unsupported claims.
3. Harness B requests resume using explicit project and task identity, optionally naming a checkpoint.
4. Blue Project authorizes disclosure to the destination before returning protected content.
5. Blue Project compares recorded workspace state with the current state and surfaces mismatches or unavailable evidence.
6. Harness B receives a bounded briefing with goal, constraints, decisions, unresolved work, evidence references, and freshness warnings.
7. Additional detail is retrieved on demand under the same disclosure controls.

## Consequences

- A checkpoint preserves engineering understanding; it does not restore uncommitted code. Cross-machine handoff requires a separate, authorized code-transfer workflow.
- Observations and verification results are historical, not automatically true of the current workspace.
- Evidence references may be unavailable to another developer or offline. The briefing must expose that limitation rather than imply completeness.
- Selective export, schema migration, and integrity verification are desirable portability capabilities.
- Conflicting engineering decisions need explicit reconciliation rather than automatic text merging.
- A resume size budget prevents accumulated context from overwhelming the receiving assistant.

## Open Questions

- How are projects and tasks identified across clones, forks, repositories, and machines?
- Which workspace fingerprints detect meaningful drift without retaining source content?
- What is the minimum portable schema and compatibility policy?
- How are concurrent checkpoints, conflicting decisions, and superseded claims represented?
- Which evidence is embedded versus referenced, and how are recipient permissions enforced?
- What makes a resume briefing successful in a two-harness evaluation?
