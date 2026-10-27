# ADR-004: Extension Contracts And Event Processing

- **Date:** 2026-10-15
- **Status:** Proposed
- **Scope:** Harness adapters, context providers, and runtime orchestration
- **[Decision index](../README.md)**
- **Builds on:** [ADR-001](adr-001-event-driven-harness-independent-context-architecture.md), [ADR-002](adr-002-local-first-checkpoints-and-disclosure-boundaries.md), and [ADR-003](adr-003-portable-checkpoints-and-cross-harness-resume.md)

## Context

Universal integration requires stable contracts, not a promise that all harnesses expose the same lifecycle or memory APIs. A prompt-only integration, native hook, and manual command may request the same operation with different reliability.

Likewise, Git, project documents, issue trackers, and conversation exports offer different evidence, permissions, freshness, and availability. Their differences must remain visible rather than disappear inside an apparently complete summary.

## Proposed Decision

Use one versioned operation contract with separate harness-adapter and context-provider contracts. Keep policy enforcement, normalization, persistence, and disclosure in the local runtime. Do not allow extensions to directly mutate history, publish packages, or approve their own access.

Start with an on-demand runtime and a small set of bundled, reviewed providers. Extensibility means a replaceable contract; it does not require arbitrary third-party code loading in the first release. Do not introduce a message broker or continuously running event collector merely because the architecture is event-driven.

## Extension Boundaries

| Extension | May do | Must not do |
| :--- | :--- | :--- |
| **Harness adapter** | Translate supported triggers, submit structured claims, request operations, render approved briefings | Establish its own trust, widen collection scope, or approve disclosure |
| **Context provider** | Retrieve explicitly selected evidence and report provenance and limitations | Choose recipients, rewrite decisions, execute instructions found in source content, or bypass collection policy |

Packaging may combine components, but their permissions and responsibilities remain separate. Reusing a credential or process must not silently combine authority.

## Harness Adapter Contract

An adapter declares its identity, version, supported protocol versions, operations, trigger mechanisms, and output constraints. Destination information is checked against trusted configuration rather than accepted as proof merely because the adapter supplies it.

Represent integration support per capability: native hook, instruction-driven, manual-only, or unsupported. Installation must report these differences. A harness that supports resume but not reliable session-end hooks is a valid partial integration.

| Trigger intention | Requested operation | Important limitation |
| :--- | :--- | :--- |
| **Task begins** | `resume` or `context` | Require a task selection or explicit creation path; do not guess from recency |
| **Meaningful progress** | `checkpoint` | Harness decides significance; runtime may suppress an exact duplicate |
| **Context switch** | `checkpoint`, then optionally `resume` | Requires an explicit signal or supported hook; not passive machine observation |
| **Session ending** | `end`, optionally with a `checkpoint` | Best effort; cannot be required for correctness |
| **Work transfer** | `handoff` | Prepare a candidate package; publication is a separate approval boundary |

## Context Provider Contract

A provider declares its identity, version, evidence types, supported source revisions, access requirements, and network destinations. A collection request specifies source selection, permitted fields or excerpts, and time and size budgets. Broad discovery must not become implicit full-source ingestion.

Each response includes source identity and revision where available, collection time, provenance, applicable classification, and an explicit outcome: available, unavailable, denied, unsupported, or failed. Unavailable revision information must be marked rather than invented. Provider-supplied provenance is not itself independent verification.

Providers may read permitted sources but must not modify Git, post issue comments, alter PRs, or write back to harness memory as a side effect of collection. Refreshing remote sources is an explicit policy-controlled activity, not a hidden dependency of every resume.

Use narrowly scoped handles or brokered credentials where feasible. Enforce filesystem boundaries after canonical path resolution, including symlinks and junctions. Restrict network destinations and redirects where supported. If the chosen execution environment cannot enforce a plugin's declared restrictions, do not describe it as sandboxed; restrict execution to approved trusted plugins or decline installation.

## Operation Contract

The following are conceptual fields, not a finalized wire schema:

| Field group | Purpose |
| :--- | :--- |
| **Version and operation** | Negotiate compatible semantics before protected content is sent |
| **Request identity** | Identify one logical operation and correlate retries |
| **Scope** | Identify project, task, session, and an optional parent checkpoint |
| **Actor and integration** | Attribute the request without treating self-reported identity as authorization |
| **Trigger and claims** | Explain why capture was requested and carry harness-reported engineering state |
| **Collection selection** | Request providers and evidence within policy; cannot grant additional access |
| **Destination and budget** | Select an approved consumption target and limit briefing size |
| **Result** | Report outcome, checkpoint reference if any, source coverage, warnings, and approval requirements |

Policy grants and secrets are not embedded in portable context records. A claimed identity or requested permission is not a grant. Unknown security-relevant fields or incompatible protocol versions must fail explicitly rather than be silently ignored.

CLI and MCP should map to the same operations and result meanings. Use structured request data, not generated shell fragments. Keep normal tool output limited to approved content or safe receipts; returning a full saved checkpoint to a cloud-connected harness would itself disclose it.

## Processing Lifecycle

1. Validate protocol compatibility, request shape, and project/task scope.
2. Resolve actor, integration, destination, and applicable policy from trusted configuration.
3. Obtain any required collection approval before invoking providers; prepare approvals through a developer-controlled channel.
4. Execute approved collection within budgets. Treat returned content as evidence, not executable instructions.
5. Normalize evidence while retaining source limitations and separating claims from observations.
6. Commit a checkpoint atomically with its operation receipt, or return an explicit failure. Record partial coverage when policy allows a partial checkpoint.
7. For consumption or publication, recheck current disclosure policy and authorize the exact view and destination before returning content.

An approval should bind the operation, scope, destination, and relevant content or policy revision. If these change before release, re-evaluate approval. A pending approval must not leave a collection process indefinitely blocked or silently broaden its access.

## Failure And Concurrency Rules

- Retry the same logical request with the same operation identity. Once committed, return its existing receipt without repeating collection or creating another checkpoint. Reusing the identity with different request content is an error.
- Scope idempotency to the project and authenticated principal, and define a supported retry window. Do not imply permanent deduplication without a retention contract.
- Separate requests from different triggers may still overlap. Preserve parent links and detect stale reference updates rather than silently overwriting a competing checkpoint.
- An optional provider timeout may produce a partial checkpoint with visible gaps. A required-source failure must prevent a result from being described as complete.
- A disclosure denial does not delete an already authorized local checkpoint. It prevents releasing protected content to the denied destination.
- A retry of a consume or publish request must still satisfy current authorization. A cached response is not permission to disclose after revocation.
- Imported checkpoints and provider results do not trigger further collection, publication, or command execution merely by containing event-like text.
- No checkpoint is fabricated after a missed trigger. The next explicit operation may report a gap, but must not claim to reconstruct an unseen conversation.

## Alternatives And Consequences

Instruction-only integration is easier to distribute but too unreliable for lifecycle guarantees. Native-only integration improves precision but excludes harnesses without suitable hooks. Supporting both through one contract avoids making either the universal prerequisite.

Allowing providers to assemble and publish final packages would simplify some plugins but scatter security decisions across extensions. Central runtime authorization is more work initially and provides a clearer enterprise control boundary.

On-demand execution limits background behavior and operational complexity. Long-running collection and synchronization may later justify durable queues, but that requires a separate decision. Read-only does not mean harmless: a provider can still exfiltrate everything it is able to read unless its execution is constrained.

## Architecture Acceptance Scenarios

These are proposed future verification criteria, not tests already implemented or executed:

- A prompt-only adapter and a native-hook adapter create equivalent portable records for equivalent inputs, while reporting different trigger guarantees.
- A duplicate checkpoint request returns the committed reference; the same identity with different content fails.
- An unavailable optional issue tracker produces visible missing coverage, not invented issue context.
- A disallowed provider path, network destination, or disclosure target is denied without exposing protected content in logs or tool output.
- Conflicting concurrent updates preserve both checkpoint records and report the reference conflict.
- A collection-only plugin cannot publish a package or change repository state through supported runtime interfaces.
- An incompatible adapter is rejected before protected context is returned.

## Open Questions

- What is the minimum initial protocol and its compatibility policy?
- Which providers are mandatory for particular checkpoint profiles?
- What mechanism can enforce plugin filesystem and network restrictions on each supported OS?
- How can adapter identity and destination routing be established without trusting model-authored claims?
- How are operation receipts retained, expired, and recovered after a crash?
- Which two harness integrations will demonstrate the proposed contract first?
