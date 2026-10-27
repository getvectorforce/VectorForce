# ADR-008: MVP Boundary And Architecture Validation

- **Date:** 2026-10-15
- **Status:** Proposed
- **Scope:** Initial product boundary, evaluation evidence, and approval gates
- **[Decision index](../README.md)**
- **Consolidates:** [ADR-001](adr-001-event-driven-harness-independent-context-architecture.md), [ADR-002](adr-002-local-first-checkpoints-and-disclosure-boundaries.md), [ADR-003](adr-003-portable-checkpoints-and-cross-harness-resume.md), [ADR-004](adr-004-extension-contracts-and-event-processing.md), [ADR-005](adr-005-project-task-and-workspace-identity.md), [ADR-006](adr-006-handoff-packages-and-context-reconciliation.md), and [ADR-007](adr-007-installation-onboarding-and-enterprise-policy.md)

## Context

The architecture discussion now covers a larger platform than is needed to test the product's core value. Implementing a plugin marketplace, enterprise control plane, many connectors, and synchronization before demonstrating useful continuity would multiply security and integration work without validating demand.

The proposed MVP must test Blue Project in an engineering-context kit, not as another assistant; its baseline competitor is a well-written handoff note combined with Git metadata, not an empty conversation.

## Proposed Decision

Constrain the first evaluation to local-first checkpoint and resume across two explicitly selected harnesses, with a bounded file-based handoff path. Use bundled, reviewed Git and selected-document providers. Define extension contracts without implementing arbitrary third-party plugin execution.

Keep the versioned protocol independent of its initial CLI transport. Add MCP or a native hook only where harness requirements justify it. Start with one approved desktop OS and document platform limits rather than promise unsupported portability. [ADR-009](adr-009-copilot-and-pi-evaluation-pair.md) identifies Copilot plus Pi for evaluation on the current Windows machine, pending local compatibility checks. Storage design and wire schema remain undecided.

No code, project installation, service deployment, or real-project collection is authorized by this record. All evaluation stages below are proposed future work.

## Core Hypotheses

| Hypothesis | Evidence that would support it | Evidence that would challenge it |
| :--- | :--- | :--- |
| **Structured checkpoints improve continuity** | Recipients recover important constraints, decisions, and next actions with less correction than the baseline | No material gain over a carefully written note, or more misleading claims |
| **Event-driven capture is sufficient** | Useful checkpoints occur during ordinary tasks without constant developer reminders | Missed triggers routinely lose essential reasoning |
| **Portability belongs in a common protocol** | The same record resumes accurately in both selected harnesses without changing its meaning | Adapter-specific assumptions dominate the core schema |
| **Privacy controls remain usable** | Developers can predict collection and approve bounded disclosure without excessive interruption | Unsafe operation requires broad implicit grants or repeated blind approvals |
| **Providers add distinct value** | Independent evidence exposes stale or unsupported harness claims | Collection adds volume and latency without improving trust or relevance |

## In Scope And Deferred

| Area | Initial evaluation scope | Deferred |
| :--- | :--- | :--- |
| **Identity** | Explicit project/task selection; one repository per checkpoint; separate worktree/session bindings | Cross-project tasks, adoption migrations, automated federation |
| **Context capture** | Harness-authored structured state plus authorized Git metadata and selected documents | Full conversation harvesting, source-code ingestion, remote connectors |
| **Storage** | Local immutable records, parent links, task references, operation receipts; basic retention/removal | Choice of database or file engine, large-scale indexing, managed archival |
| **Operations** | Checkpoint, bounded context/resume, handoff preparation/export/import; best-effort end | Background synchronization, event broker, autonomous agents |
| **Integrations** | Two verified harness integrations with explicit CLI fallback | Universal hook guarantees, hosted-agent bridges, broad IDE support |
| **Disclosure** | Destination-aware consumption and explicit approval of exact exports | General-purpose DLP, automatic declassification, revocable plaintext exports |
| **History** | Preserve divergent records, detect concurrent reference updates; explicitly select or reconcile context | Automatic semantic merge or guaranteed contradiction detection |
| **Extensions** | Two bundled providers behind a documented contract | Marketplace, unreviewed plugins, cross-platform plugin sandbox |
| **Administration** | Clear local settings and safety rules; safe diagnostics; documented limitations | Organization enrollment, policy distribution service, SSO, managed team storage |

Local retention/removal behavior and a concrete storage engine must be chosen before a prototype persists real context. Deferring the technology choice does not defer the need for a reliable, recoverable implementation.

The initial evaluation is not enterprise-ready merely because enterprise requirements have been documented. Organizations requiring managed policy, authentication, or device controls cannot use a local unmanaged pilot as a substitute. Expand scope only through an explicit decision tied to a target adopter's requirements.

## Smallest Complete Journey

1. A developer initializes an approved non-sensitive project, previews the instruction integration, and selects a task.
2. Harness A submits structured intent, decisions, blockers, and next steps. Blue Project collects permitted evidence and saves a private checkpoint.
3. The developer switches to Harness B, explicitly selects the same task, and authorizes consumption for the configured destination.
4. Blue Project reports workspace drift and evidence gaps, then returns a bounded briefing without upgrading claims to facts.
5. The developer prepares a selected handoff view, approves its exact export, and imports it in a separate authorized local workspace.
6. The recipient can resume or report missing context. Parallel work remains separate rather than being silently overwritten.

Use committed or separately transferred code for the cross-workspace step. The context package is not a source-code backup. If either harness processes data remotely, use synthetic or explicitly approved information; local execution does not imply local model processing.

## Validation Stages

### Stage 1: Architecture And Capability Review
Before coding, confirm the actual supported instruction files, hooks, execution environment, CLI/tool access, and destination configuration for the two candidate harnesses. Record product versions, evidence sources, and limitations in a capability matrix. [ADR-009](adr-009-copilot-and-pi-evaluation-pair.md) records an initial public-documentation review; installed versions, effective settings, and runtime compatibility have not been verified.

Walk through synthetic checkpoint, duplicate request, ambiguous task, denied destination, partial provider result, missed end event, and conflicting-history examples on paper. Review the proposed data flows and trust boundaries. Revise the contract when these examples reveal ambiguity rather than adding a new service by default.

### Stage 2: Explicitly Approved Prototype
Only after separate implementation approval, build the smallest complete journey using synthetic or approved non-sensitive fixtures. Keep a manual CLI path to separate protocol defects from unreliable assistant invocation. Test CLI and any optional transport against equivalent protocol fixtures.

Measure trigger reliability separately from checkpoint quality; distinguish a trigger opportunity, actual invocation, accepted request, committed checkpoint, and useful resume. Do not report protocol success as evidence that instructions are reliably followed.

### Stage 3: Consented Pilot
Only after explicit data and participation approval, compare Blue Project with a structured handoff note containing the same initial tasks and Git metadata. Include same-developer harness switching and a second-developer handoff. Use comparable tasks and counterbalanced evaluation order where practical; report the small sample and other limitations.

Agree on the rubric, workload, sample, and numeric thresholds before the pilot. They are not set or satisfied by this document. Capture enough evidence to explain failures without recording unnecessary conversations or source material.

## Proposed Release Gates

| Gate | Required evidence |
| :--- | :--- |
| **Meaning preservation** | Review of goal, constraints, decisions, unresolved work, and verification scope against a prepared reference; no critical constraint silently inverted |
| **Value over baseline** | Pre-agreed improvement in resume time or correction effort without a worse critical-error rate; otherwise revisit the product premise |
| **Capture reliability** | Measured invocation and checkpoint completion rates by integration mode, with missed triggers and manual intervention reported |
| **Data boundary** | Exercised allowlist/denial cases and inspected outputs, logs, and network behavior show no forbidden disclosures in the tested scenarios; not a claim of universal prevention |
| **Identity and history** | Ambiguous selection does not guess; duplicate requests do not duplicate committed record; concurrent updates preserve competing history |
| **Evidence integrity** | Unavailable sources remain visible, unsupported claims remain labeled, and workspace mismatch does not become a false verification claim |
| **Integration safety** | Repeated initialization is idempotent, modified blocks are preserved, and removal only affects approved managed content |
| **Portability and usability** | Both harnesses consume the same record semantics; export/import preserves approved provenance and respects briefing limits |
| **Operational behavior** | Crash/retry recovery, bounded collection, cancellation, and latency meet a pre-agreed workload and budget |

A critical privacy, authorization, or data-loss failure blocks advancement regardless of average usability scores. Passing synthetic tests supports a bounded claim about that prototype, not certification for enterprise deployment.

## Blocking Decisions Before Implementation

| Decision | Recommended starting point | Approval still needed |
| :--- | :--- | :--- |
| **Initial audience** | Individual developer switching harnesses, followed by a small teammate handoff | Confirm the primary user and evaluation journey |
| **Harness pair and OS** | Copilot in VS Code plus Pi on the current Windows machine, as recorded in [ADR-009](adr-009-copilot-and-pi-evaluation-pair.md) | Verify installed versions, instruction discovery, supported invocation paths, and Windows prerequisites |
| **Data and approval boundary** | Bundled read-only providers, explicit content scope, developer-controlled approvals, no default networking by the runtime | Choose approval mechanism and credible destination binding |
| **Protocol and persistence** | Minimal versioned records and operation receipts with recovery semantics | Select schema, compatibility rules, storage engine, protection, and retention defaults |
| **Pilot success** | Beat a structured-note baseline on useful continuity without weakening safety | Set the rubric, sample, budgets, and numeric success thresholds |

These are product-owner decisions informed by feasibility evidence. "Keep documenting" does not select technologies, approve protocols, or authorize implementation.

## Expansion Rules

- Add a remote provider only when missing evidence repeatedly prevents useful resume and the connector's permissions and provenance model is understood. Add managed sharing when file exchange and explicit approvals demonstrate that the target collaboration workflow, not a desire for background sync, is the limiting factor.
- If cross-harness continuity succeeds only with full transcript scraping, continuous observation, or broad implicit disclosure, reconsider the premise within the original privacy constraints rather than silently relaxing them. If a structured note performs equally well, narrow the product to the provenance, policy, or interoperability value that evidence actually supports.

## Open Questions

- Which blocking decisions should be resolved first with the product owner?
- What counts as a critical missed constraint or misleading verification claim in the target workflow?
- What minimal evidence demonstrates value beyond a structured handoff note?
- Which enterprise requirements are true pilot prerequisites rather than future platform capabilities?
