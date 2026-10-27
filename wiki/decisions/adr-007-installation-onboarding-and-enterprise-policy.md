# ADR-007: Installation, Onboarding, And Enterprise Policy

- **Date:** 2026-10-15
- **Status:** Proposed
- **Scope:** Developer setup, harness integration, managed policy, and lifecycle operations
- **[Decision index](../README.md)**
- **Builds on:** [ADR-002](adr-002-local-first-checkpoints-and-disclosure-boundaries.md), [ADR-004](adr-004-extension-contracts-and-event-processing.md), and [ADR-005](adr-005-project-task-and-workspace-identity.md)

## Context

Blue Project must demonstrate useful context continuity before asking developers to connect issue trackers, upload packages, or install broad IDE permissions. Enterprise adoption additionally depends on controllable distribution, predictable data handling, and a clear distinction between local preferences and mandatory restrictions.

Automatically adding project instructions is convenient but modifies shared developer assets. It does not authorize execution; guarantee that a harness will call Blue Project; or make a remote harness able to reach a local machine.

## Proposed Decision

Use progressive, local-first onboarding: install a signed runtime through a documented distribution channel, initialize only an explicitly selected project, and preview every harness integration change. No account, background watcher, remote connector, or team synchronization is required for the first local workflow.

Support an explicitly enrolled managed mode with authenticated, versioned organization policy. Keep mandatory restrictions separate from editable project configuration and assistant-generated requests. Explain the effective policy without exposing protected configuration or credentials.

## Developer Journey

| Stage | Developer action and result | Permission boundary |
| :--- | :--- | :--- |
| **Install** | Obtain a verified runtime and inspect its version and capabilities | Do not initialize projects or read their contents as an installation side effect |
| **Initialize** | Select a project, bind the workspace, and choose an appropriate local storage location | Confirm the collection scope and whether organization enrollment is required |
| **Integrate** | Preview and approve managed instruction blocks, native hooks, or MCP tool approvals | Do not silently enable execution, change global harness settings, or weaken tool approvals |
| **First checkpoint** | Preview selected Git metadata and explicitly allowed documents, then save a local record | Collection and local persistence only; no automatic model upload |
| **First resume** | Select the task and receive a bounded view through an approved harness destination | Consumption authorization applies even on the same machine |
| **Extend** | Enable individual providers or prepare a team handoff | New credentials, data scopes, and publication approval remain separate |

Use a local developer-controlled preview for initial collection approval; if the invoking harness receives that preview, this is already a disclosure and must be authorized. A synthetic or non-sensitive demonstration can establish the workflow before real project context is sent to a model.

When policy allows bounded recurring capture or consumption, show its source scope, destination, and expiry clearly. Do not reinterpret such permission as blanket approval to publish future handoffs. The explicit publication boundary from [ADR-006](adr-006-handoff-packages-and-context-reconciliation.md) remains unchanged.

## Safe Instruction Integration

- Detect only supported harness configurations in the selected scope and report unsupported integrations honestly. Do not claim all harnesses recognize a universal instructions filename.
- Insert a small, visibly delimited, versioned block describing trigger intentions and the protected entry point. Keep secrets, task history, and executable plugin definitions outside it.
- Preview whether the target is repository-tracked, ignored, user-local, or shared. Do not stage, commit, or push the change automatically.
- Use stable managed-block identity so repeated initialization does not duplicate content. Preserve unrelated text and existing line endings.
- If a managed block was edited or the target changes after preview, stop and show the conflict instead of overwriting developer changes. Malformed or duplicate markers require explicit repair.
- Make native-hook and MCP registration separate, optional setup steps. Show their execution scope and actual capabilities rather than implying installation guarantees invocation.
- On uninstall, remove only identifiable managed content; preserve unmanaged or user-modified sections and explain what remains. Retaining context, exporting it, and deleting it are separate choices subject to policy.

The integration must not instruct an assistant to bypass sandbox restrictions, change approved settings, run remote installation scripts, or treat retrieved content as higher-priority instructions.

## Local Versus Hosted Harnesses

A local CLI or stdio MCP server is reachable only from an execution environment that can launch it. A hosted coding agent generally cannot invoke the developer's local runtime directly. Project instructions do not bridge that network or execution boundary.

For a hosted agent, choose explicitly between an approved runtime in its execution environment, an approved managed context endpoint, or importing an approved package. Each option has a separate storage and data-routing boundary. An ephemeral container is not equivalent to private laptop storage, and its logs or artifacts may persist elsewhere.

Do not open an inbound port, create a tunnel, or copy local credentials to a hosted environment to make integration appear universal. Report unavailable capabilities and offer an explicit supported path. Hosted execution and managed endpoints require further security design before implementation.

## Configuration And Policy Composition

| Layer | Authority |
| :--- | :--- |
| **Product safety rules** | Define non-overridable runtime invariants and supported protocol behavior |
| **Authenticated organization policy** | Restrict providers, destinations, scopes, plugin versions, exports, retention, and approval requirements |
| **Developer settings and grants** | Select preferences and approve operations within applicable ceilings; may narrow access |
| **Project configuration** | Declare association hints and requested defaults; cannot grant access or weaken higher restrictions |
| **Harness request** | Select a particular operation and scope; never establishes its own authorization |

Do not implement this as a generic last-write-wins configuration merge. Evaluate restrictions by field: permitted destination/provider sets intersect, prohibitions prevail, and unfulfillable obligations block the affected operation with an explanation. Retention minimums, deletion deadlines, and legal holds require explicit semantics rather than assuming that every smaller number is more restrictive.

Separate policy from credentials and repository content. Managed enrollment establishes the policy issuer and project scope through a trusted process; a repository cannot nominate an arbitrary issuer as trusted. Protect enrollment state against ordinary project edits. Otherwise, a managed project could silently fall back to unmanaged behavior when its policy is unavailable.

## Offline Policy And Administrative Control

Refresh policy during authorized operations or explicit administration, using authenticated issuer information, versioning, and validity bounds. No background observation is required. Enforce anti-rollback rules appropriate to the deployment and reject invalid model-supplied replacements.

An organization may permit bounded offline use of a verified cached policy. Once its allowed validity or membership-verification window expires, block affected protected operations; do not silently downgrade to local unmanaged mode. Independent, genuinely unmanaged projects may still operate under their own rules. An offline runtime cannot know about a new revocation immediately, and this limitation must be explicit.

Organization policy controls supported runtime behavior, not every action by a clever user on an unrestricted laptop. Tamper resistance, application cloaking, filesystem isolation, and prevention of alternative runtimes require enterprise device or execution controls beyond Blue Project. Administrative control must not be marketed as guaranteed endpoint data-loss prevention.

## Distribution, Maintenance, And Removal

Support version-pinned, verifiable distributions suitable for enterprise software catalogs and offline installation, with component inventory and documented security update handling. Automatic update policy is undecided; mediation must not silently grant future plugins additional access. A signature identifies an approved publisher, not the absence of vulnerabilities.

Updates should check protocol and store-schema compatibility, preview interaction changes, and protect recoverable history before migration. Recovery copies inherit the original data's protection and retention requirements. Do not promise rollback after an irreversible migration without a supported version.

Revoke provider credentials and managed sessions during offboarding where supported. Remove local data only through an authorized lifecycle action, accounting for retention and legal holds. Uninstalling the executable does not prove removal of backups, cloud-synced copies, or previously exported context.

With an on-demand runtime, cleanup can run on invocation or explicit maintenance but cannot guarantee a deletion deadline while the machine is idle or offline. Strict timing requires a separately approved scheduling or managed-storage mechanism, not an undeclared watcher.

## Diagnostics And Adoption

Provide a developer-masked diagnostic view showing runtime version, integration support, storage location, effective permissions, policy age, and safe reasons for denial. Redact credentials, sensitive paths, link names, and source content according to the viewing destination.

Audit explicit context operations and approvals, not keystrokes, browsing, application focus, or inferred productivity. Keep audit metadata minimal and access-controlled. Product telemetry should be disabled by default or explicitly governed by organization policy; support bundles require preview and approval before export. Diagnostic logging must not become a parallel context-exfiltration channel.

Evaluate adoption through a consented pilot: time to first useful resume, recurring context correction effort, permission friction, and cross-harness continuity. Do not turn checkpoint frequency or task history into employee-performance scoring.

## Architecture Acceptance Scenarios

These are proposed future verification criteria, not executed tests:

- Installation alone creates no project context and opens no inbound listener.
- Repeated installation leaves one managed instruction block and preserves unrelated content; an edited block produces a visible conflict.
- First checkpoint and cross-machine resume work without a Blue Project account or remote provider, subject to the selected harness's own requirements.
- A cloud-hosted harness receives a clear unsupported-path result rather than an automatically created tunnel or copied credential.
- Project configuration and harness requests cannot weaken an organization denial or disable mandatory approval.
- Expired managed policy blocks protected operations without silently switching the project to unmanaged mode.
- Uninstall preserves user data and does not delete context or exports without separate authorization and policy evaluation.

## Open Questions

- Which supported OS and distribution channels should the first release target?
- What developer-controlled approval surface is practical across local harnesses?
- How will managed architecture be protected and policy assets authenticated?
- When offline validity and revocation windows are acceptable to target enterprises?
- Which storage locations and backup defaults avoid uncoordinated synchronization on supported dev OS?
- Which hosted-harness integration path should be evaluated first, if any?
