# Blue Project Decision Wiki

Blue Project is the working name for a portable engineering-context platform, previously discussed as Context OS. It is "Git for engineering context", not another AI coding assistant.

## Decision Index

| ID | Decision | Status | Date |
| :--- | :--- | :--- | :--- |
| [ADR-001](decisions/adr-001-event-driven-harness-independent-context-architecture.md) | [Event-driven, harness-independent context architecture](decisions/adr-001-event-driven-harness-independent-context-architecture.md) | Accepted in principle | 2026-10-15 |
| [ADR-002](decisions/adr-002-local-first-checkpoints-and-disclosure-boundaries.md) | [Local-first checkpoints and disclosure boundaries](decisions/adr-002-local-first-checkpoints-and-disclosure-boundaries.md) | Accepted in principle; detailed permission details proposed | 2026-10-15 |
| [ADR-003](decisions/adr-003-portable-checkpoints-and-cross-harness-resume.md) | [Portable checkpoints and cross-harness resume](decisions/adr-003-portable-checkpoints-and-cross-harness-resume.md) | Proposed | 2026-10-15 |
| [ADR-004](decisions/adr-004-extension-contracts-and-event-processing.md) | [Extension contracts and event processing](decisions/adr-004-extension-contracts-and-event-processing.md) | Proposed | 2026-10-15 |
| [ADR-005](decisions/adr-005-project-task-and-workspace-identity.md) | [Project, task, and workspace identity](decisions/adr-005-project-task-and-workspace-identity.md) | Proposed | 2026-10-15 |
| [ADR-006](decisions/adr-006-handoff-packages-and-context-reconciliation.md) | [Handoff packages and context reconciliation](decisions/adr-006-handoff-packages-and-context-reconciliation.md) | Proposed | 2026-10-15 |
| [ADR-007](decisions/adr-007-installation-onboarding-and-enterprise-policy.md) | [Installation, onboarding, and enterprise policy](decisions/adr-007-installation-onboarding-and-enterprise-policy.md) | Proposed | 2026-10-15 |
| [ADR-008](decisions/adr-008-mvp-boundary-and-architecture-validation.md) | [MVP boundary and architecture validation](decisions/adr-008-mvp-boundary-and-architecture-validation.md) | Proposed | 2026-10-15 |
| [ADR-009](decisions/adr-009-copilot-and-pi-evaluation-pair.md) | [Copilot and Pi evaluation pair](decisions/adr-009-copilot-and-pi-evaluation-pair.md) | Selected for evaluation; local compatibility pending | 2026-10-15 |
| [ADR-010](decisions/adr-010-local-prototype-foundation.md) | [Local prototype foundation](decisions/adr-010-local-prototype-foundation.md) | Initial synthetic-data prototype implemented; broader security review pending | 2026-10-15 |
| [ADR-011](decisions/adr-011-explicit-document-collection.md) | [Explicit document collection](decisions/adr-011-explicit-document-collection.md) | Implemented for synthetic-data prototype; broader security review pending | 2026-10-15 |
| [ADR-012](decisions/adr-012-target-harness-selection-antigravity-commandcode-pidev.md) | [Target harness selection: Antigravity, Command Code, and Pi.dev](decisions/adr-012-target-harness-selection-antigravity-commandcode-pidev.md) | Proposed / Accepted for evaluation | 2026-10-17 |
| [ADR-013](decisions/adr-013-ai-reasoning-layer-and-provider-authorization.md) | [AI reasoning layer and model provider authorization](decisions/adr-013-ai-reasoning-layer-and-provider-authorization.md) | Proposed / Implemented for the Meta Muse hackathon build | 2026-10-18 |
| [ADR-014](decisions/adr-014-vectorforce-studio-and-local-topology-visualizer.md) | [VectorForce Studio and local topology visualizer](decisions/adr-014-vectorforce-studio-and-local-topology-visualizer.md) | Proposed / Implemented for the Meta Muse hackathon build | 2026-10-18 |

## Current Focus

- **ADR-014** introduces **VectorForce Studio**: a local-first visual engineering control center and architecture topology visualizer (`vf studio` / `vf ui`). Built with zero external backend runtime dependencies, it serves an interactive SVG dependency and blast radius graph, real-time drift alerts, and a Meta Llama AI reasoning console on port 3210.
- **ADR-013** introduces the **AI Engineering Memory**: a Llama-powered reasoning layer (`vf reason` / `reason_about_task`) that rebuilds a narrative continuation from checkpoints and the live codebase, surfaced with a cloud Meta Llama/Muse provider or a local Ollama runtime. It preserves the claims/evidence distinction and the zero-dependency invariant.
- **ADR-012** defines the updated target harness pair on macOS: **Google Antigravity** as the primary IDE harness paired with **Command Code (`command-code`)** or **Pi (`pi.dev`)** as terminal coding harnesses, leveraging Model Context Protocol (MCP) and a unified CLI.
- **ADR-008** consolidates the recommended first scope and approval gates. It does not approve the entire proposals or authorize implementation. The next step is to resolve its blocking decisions and validate harness capabilities, not expand the feature list by default.
- **ADR-009** previously recorded Copilot in VS Code plus Pi on Windows; superseded/refined by ADR-012 for the active macOS environment.
- **ADR-010** records the authorized start of implementation, user-local Node installation, initial CLI/store behavior, and verification limits. See the project README for the synthetic walkthrough; Pi and full harness interoperability remain pending.
- **ADR-011** adds project-scoped exact-path document allowlists, bounded collection, provenance, and explicit evidence gaps. Verification now covers 32 automated tests; model disclosure and real-project collection remain out of scope.

## Delivery Planning

| Document | Status | Purpose |
| :--- | :--- | :--- |
| [MVP task breakdown](planning/mvp-task-breakdown.md) | In progress | Phased tasks, dependencies, completion criteria, and approval gates for Antigravity, Command Code, and Pi |
| [Phase 0 environment and baseline](planning/phase-0-environment-and-baseline.md) | Complete | Host environment inventory, harness capability matrix, primary journey, and evaluation rubric |
| [Phase 1 architecture and contracts](planning/phase-1-architecture-and-contracts.md) | Complete (Gate G1 Approved) | Portable schemas, authorization model, Node 22/SQLite store foundation, threat model, and synthetic walkthroughs |
| [Phase 2 prototype implementation](planning/phase-2-prototype-implementation.md) | Complete (Milestone M1 Achieved) | Local vertical slice (T10–T15), zero-dependency SQLite store, Authorizer, Git/Doc providers, and CLI test suite (26 passing tests) |
| [Phase 3 Antigravity & Command Code integration](planning/phase-3-antigravity-commandcode-integration.md) | Complete (Milestone M2 Achieved) | Stdio Model Context Protocol (MCP) server, reversible harness configuration, and bidirectional Antigravity <-> Command Code task handover (32 passing tests) |

## Reading The Records

- **Accepted in principle**: the direction was agreed during brainstorming; protocol and implementation details remain undecided.
- **Proposed**: a recommendation discussed but not explicitly approved.
- **Superseded**: retained for history, with a link to its replacement.
- **Open questions** are not decisions or implementation commitments.

## Documentation Practice

Continue recording architecture discussions here and update this index whenever a record is added or its status changes. Each record should preserve context, the decision or proposal, consequences, and unresolved questions. Material reversals should use a new record that supersedes the previous one.

This wiki records architecture and implementation progress. The developer authorized the local prototype and a user-local Node.js installation. [ADR-013](decisions/adr-013-ai-reasoning-layer-and-provider-authorization.md) additionally authorizes a hackathon-scoped model provider (cloud Meta Llama/Muse or local Ollama) for the AI reasoning layer; deployment, Pi installation, and any real-project pilot remain unauthorized. Earlier proposal statuses remain unchanged unless a later record explicitly updates them.
