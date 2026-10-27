# ADR-006: Handoff Packages And Context Reconciliation

- **Date:** 2026-10-15
- **Status:** Proposed
- **Scope:** Selective export, recipient authorization, import, and divergent histories
- **[Decision index](../README.md)**
- **Builds on:** [ADR-002](adr-002-local-first-checkpoints-and-disclosure-boundaries.md), [ADR-003](adr-003-portable-checkpoints-and-cross-harness-resume.md), [ADR-004](adr-004-extension-contracts-and-event-processing.md), and [ADR-005](adr-005-project-task-and-workspace-identity.md)

## Context

A developer handing work to another person needs to share intent, decisions, evidence, and next actions without exporting every conversation or private checkpoint. Recipients may have different source permissions and use different coding harnesses. Both developers may continue working after the handoff, creating divergent histories.

The Git analogy is useful for preserving ancestry, but context contains assertions and judgments rather than only file changes. A successful transfer does not mean the recipient has accepted responsibility, the underlying code is available, or contradictory decisions have been resolved.

## Proposed Decision

Treat a handoff as a recipient-scoped, immutable export view of explicitly selected content. Keep the original checkpoints private unless separately approved. Separate preparation, approval, publication, delivery acknowledgment, and task acceptance.

Imports preserve origin and create no access grants. Divergent checkpoints remain available as parallel history. Reconciliation creates a new, attributed record referencing the relevant accessible parents; it does not overwrite earlier decisions or silently declare the newest assertion correct.

## Package Contract

The following defines conceptual contents, not a finalized archive or wire format:

| Area | Contents |
| :--- | :--- |
| **Manifest** | Package identity, schema version, project/task origin, creation time, and selected checkpoint references |
| **Engineering briefing** | Goal, constraints, decisions, rationale, blockers, verification scope, and suggested next actions |
| **Evidence selection** | Approved embedded evidence or scoped references, with source revisions and availability limitations |
| **Provenance** | Claim versus observation versus human approval, producing actor/provider, and source attribution |
| **Disclosure envelopes** | Intended recipients, destination, classification, approved purpose or scope, and expiry where applicable |
| **Completeness** | Known omissions and unresolved conflicts, described only at an authorized level of detail |
| **Integrity** | A digest of the exact exported representation and optional authenticated publisher attestation |

Do not recursively export parent checkpoints, attachments, source URLs, or linked documents by default. Clean filenames, issue titles, hidden-parent identifiers, and omission descriptions can leak information. Expose only approved metadata; a generic limited-coverage warning may be safer than describing a restricted source.

Filtering produces a new export representation with its own identity and integrity value. Do not reuse a full private checkpoint digest as the identity of different redacted bytes. Detailed private-to-export mappings may remain only in the sender's authorized audit store. Publisher attestations establish origin and integrity only to the extent the publisher identity is trusted; they do not prove an engineering claim is true.

## Handoff Lifecycle

1. Prepare a local candidate for an explicit task and audience. Do not publish or disclose its body through assistant tool output as a side effect.
2. Evaluate selected content against source redistribution restrictions, organization policy, recipient eligibility, and the intended processing destination.
3. Preview the exact export and its limitations through a developer-controlled approval interface. Bind approval to package bytes, destination, and audience.
4. Recheck relevant policy and recipient eligibility immediately before publication. Any content or policy change requires renewed evaluation and approval.
5. Publish through an approved transport, recording a safe receipt and acknowledgment status (unconfirmed, failed, or uncertain).
6. Validate and import on the recipient side, preserving origin without activating instructions, plugins, repository bindings, or new provider access.
7. Record delivery acknowledgment separately from explicit task acceptance. Acknowledgment does not close the sender's session or prevent further checkpoints.

Publication retries must use the operation identity rules from [ADR-004](adr-004-extension-contracts-and-event-processing.md). When transport completion is uncertain, report uncertainty and reconcile delivery status where supported rather than promise exactly-once external delivery.

Task acceptance is an attributed workflow record, not an automatic issue-tracker assignment. External ownership changes require a separate authorized operation; read-only context providers must not perform them.

## Recipient And Source Permissions

Permission to read a source is not permission to redistribute it. Embedding source content requires an applicable redistribution basis; linking to a restricted source grants no access. Let the recipient retrieve linked evidence using their own authorized credentials, only on an explicit request or approved operation.

If recipient eligibility cannot be established, exclude the protected content or block publication. A sender's generic approval cannot override organization or source restrictions. Keep summaries at least as restricted as their contributing evidence unless an authorized declassification process explicitly permits otherwise; removing quotations does not remove confidentiality.

Authorization to send a package to a developer is not authorization to send it to that developer's cloud assistant. Recipient-side consumption and onward sharing must still pass their respective policy checks.

| Transport mode | Benefit | Security limitation |
| :--- | :--- | :--- |
| **Explicit file export/import** | Portable, offline-capable, no required collaboration service | Once plaintext is available, recipient labels and expiry are not enforceable; revocation or DRM |
| **Authenticated managed sharing** | Can enforce current membership at retrieval and revoke future service access | Downloaded plaintext and prior disclosures cannot reliably be recalled |

The initial architecture should support explicit export/import without requiring a service, but policy may prohibit file exports for protected material. Managed sharing is optional, and its identity, encryption, search, audit, and offline-access design requires a separate decision. Synchronization should remain explicit or tied to approved operations rather than introduce machine monitoring.

## Import Safety And Compatibility

Treat packages as untrusted input even when they have a valid signature. Enforce schema and resource limits, validate integrity, reject unsafe paths if an archive format is used, and never execute embedded commands or automatically follow evidence URLs. Unknown mandatory semantics must fail closed.

An import may be stored in a restricted staging area pending origin verification and project association. Import success is distinct from readiness to resume: unavailable code, missing evidence, denied model destinations, or incompatible schemas may prevent useful consumption. Credentials and executable plugin configuration are never imported.

## Divergence And Reconciliation

Suppose two developers start from checkpoint C. One records a decision to preserve an API; the other records a decision to change it. Store both descendants. Do not use wall-clock order to choose the accepted decision; clocks can differ, and a later statement may be less informed.

Where explicit references remain inconsistent claims, mark them unresolved. Semantic contradiction detection may assist but cannot guarantee discovery. A reconciliation record should identify which claims are retained, superseded, or still disputed, along with rationale, evidence, scope, and the approving actor where required.

Only a principal authorized to resolve conflicting decisions may write the reconciliation. An assistant can draft a resolution, not silently elevate it to human-approved status. Do not expose inaccessible history through conflict warnings. If authorized evidence is multitenant, keep the limitation visible at an approved level rather than invent consensus.

Update a preferred task reference only after detecting concurrent changes, preserving both branches if another update intervened. A new preferred reference is a navigation choice, not proof of consensus or correctness. Published packages remain historical corrections use a new package and, where supported, an advisory supersession notice. Without a watcher or online connection, recipients may not learn of corrections until their next authorized interaction.

## Consequences And Alternatives

- Full-history export is simpler but exposes unnecessary material and insensitive references; selective export is the proposed default.
- A live shared document is easy to edit but can obscure who held which understanding; immutable records preserve provenance while allowing new resolutions.
- Last-write-wins conflict handling can discard valid engineering decisions and management consensus.
- Review adds friction. Clear task-focused previews and safe defaults should reduce repeated decisions without eliminating the explicit publication boundary.
- Immutability is a history model, not a promise to retain sensitive data forever. Retention, deletion, and backup handling remain separate policy obligations.

## Architecture Acceptance Scenarios

These are proposed future verification criteria, not executed tests:

- A handoff from a checkpoint with private annotations exports only the approved view, without hidden ancestor metadata or automatic attachment traversal.
- Changing package bytes or the audience after approval prevents publication under the old approval.
- A recipient lacking source rights cannot retrieve embedded reference under a summary or copied link metadata.
- Importing a signed package does not execute its content, fetch linked URLs, install extensions, or grant project access.
- Parallel divergent sessions survive without a timestamp-based winner; an attributed reconciliation preserves both origins.
- Delivery acknowledgment does not automatically assign a Jira issue, accept ownership, or end the sender's task session.
- Revoking managed access blocks future authorized retrievals without claiming to erase exported plaintext.

## Open Questions

- What minimal package format supports selective evidence and version compatibility without unnecessary complexity?
- How are organization-specific redistribution rights and declassification decisions represented and verified?
- Which export profiles are useful: real-time, teammate handoff (team-internal), or cross-organization transfer?
- Which task-reference updates require human approval and who may resolve conflicting decisions?
- How should retention and correction notices propagate across imported copies without overwriting antecedents?
