# Blue Project MVP Task Breakdown

- **Created:** 2026-10-15 (Updated: 2026-10-17)
- **Status:** Implementation started; local foundation only
- **Harnesses:** Google Antigravity (IDE) and Command Code / Pi.dev (Terminal), on macOS
- **[Wiki index](../README.md)**
- **Scope references:** [ADR-008: MVP boundary](../decisions/adr-008-mvp-boundary-and-architecture-validation.md), [ADR-009: Copilot and Pi](../decisions/adr-009-copilot-and-pi-evaluation-pair.md), and [ADR-012: Target Harness Selection (Antigravity, Command Code, Pi.dev)](../decisions/adr-012-target-harness-selection-antigravity-commandcode-pidev.md)

## Outcome And Constraints

Prove that a developer can checkpoint engineering context in one harness, resume accurately in the other, and explicitly export a selected handoff without continuous monitoring or unnecessary source disclosure. Test both transfer directions against a structured-note baseline.

This is a delivery plan, not a blanket architecture approval. The developer subsequently requested implementation and approved a user-local Node.js installation. [ADR-010](../decisions/adr-010-local-prototype-foundation.md) records the resulting synthetic-data foundation. Other installation, integration, model use, and real-project collection still require applicable approval; prior proposal statuses are not automatically accepted.

## Tracking Rules

Task states are **Not Started**, **In Progress**, **Blocked**, **Done**, and **Deferred**. Tasks absent from the progress table below remain **Not Started**. Mark a task **Done** only after linking its deliverable and verification evidence here. Documentation-link validation is not evidence of product functionality. The initial foundation request is not evidence that the complete G1 security/design review or later release gates have passed.

## Current Progress

- **Evidence:** [ADR-010](../decisions/adr-010-local-prototype-foundation.md), [ADR-011](../decisions/adr-011-explicit-document-collection.md), [ADR-012](../decisions/adr-012-target-harness-selection-antigravity-commandcode-pidev.md), [Phase 0 Deliverable](phase-0-environment-and-baseline.md), [Phase 1 Deliverable](phase-1-architecture-and-contracts.md), [Phase 2 Deliverable](phase-2-prototype-implementation.md), [Phase 3 Deliverable](phase-3-antigravity-commandcode-integration.md), [Phase 4 Deliverable](phase-4-handoff-and-safety-validation.md), core implementation, core tests, and CLI tests.
- **Current verification:** 39 automated tests passed across 12 test suites; local environment inventory completed and verified for macOS, Google Antigravity, and Command Code v1.84.0.

| Task | Status | Actual Completion Or Remaining Work |
| :--- | :--- | :--- |
| **T01** | Done | macOS 15.7.9, Node v22.23.2, Git 2.39.5, SQLite 3.43.2, and Command Code v1.84.0 inventoried; Pi absent (documented gap). See [Phase 0 Deliverable](phase-0-environment-and-baseline.md#1-t01-local-evaluation-environment-inventory). |
| **T02** | Done | Capability matrix completed; verified native stdio MCP support in both Antigravity and Command Code (`cmd mcp`). See [Phase 0 Deliverable](phase-0-environment-and-baseline.md#2-t02-integration-capabilities-matrix). |
| **T03** | Done | Confirmed single-dev macOS switching between Antigravity and Command Code with bounded synthetic document fixtures. See [Phase 0 Deliverable](phase-0-environment-and-baseline.md#3-t03-primary-journey-and-data-scope-confirmation). |
| **T04** | Done | Defined evaluation rubric: 100% meaning preservation, zero fact/claim confusion, <500ms latency, zero unallowlisted leaks, and structured-note baseline. See [Phase 0 Deliverable](phase-0-environment-and-baseline.md#4-t04-evaluation-rubric-and-baseline). |
| **T05** | Done | Strict JSON schemas defined for checkpoint, receipt, identity, provenance, and MCP tool signatures. See [Phase 1 Deliverable](phase-1-architecture-and-contracts.md#1-t05-minimal-portable-records-and-protocol-specification). |
| **T06** | Done | Three-boundary authorization model specified (capture, consume, publish) with zero-leak receipt guarantees. See [Phase 1 Deliverable](phase-1-architecture-and-contracts.md#2-t06-authorization-and-approval-specification). |
| **T07** | Done | macOS/Node 22 native modules, SQLite schema DDL, WAL mode, ~/.vectorforce store layout, and atomicity specified. See [Phase 1 Deliverable](phase-1-architecture-and-contracts.md#3-t07-local-implementation-foundation-specification). |
| **T08** | Done | Threat model and trust boundary review completed covering prompt injection, path traversal, exfiltration, and races. See [Phase 1 Deliverable](phase-1-architecture-and-contracts.md#4-t08-threat-model-and-trust-boundary-review). |
| **T09** | Done | 6 synthetic scenarios walked through covering normal resume, duplicate replay, ambiguous tasks, drift, denied destinations, and divergent heads. See [Phase 1 Deliverable](phase-1-architecture-and-contracts.md#5-t09-synthetic-scenario-walkthroughs). |
| **T10** | Done | Dependency-free native ESM module/test foundation implemented; Git initialized; passes 26 tests on Node 22 native test runner. See [Phase 2 Deliverable](phase-2-prototype-implementation.md#31-t10-approved-project-and-test-foundation). |
| **T11** | Done | Explicit project canonicalization and unambiguous task resolution implemented; ambiguous selection never guesses. See [Phase 2 Deliverable](phase-2-prototype-implementation.md#32-t11-project-task-and-session-bindings). |
| **T12** | Done | Atomic checkpoints and operation receipts committed via node:sqlite in single transaction; SHA-256 idempotency replay and parent lineage tested. See [Phase 2 Deliverable](phase-2-prototype-implementation.md#33-t12-checkpoint-history-and-atomic-receipts). |
| **T13** | Done | Strict runtime policy, path traversal defense, symlink rejection, destination gating, and safe receipts verified. See [Phase 2 Deliverable](phase-2-prototype-implementation.md#34-t13-runtime-policy-and-safe-receipts). |
| **T14** | Done | Non-destructive read-only GitProvider and exact-allowlist DocumentProvider with size caps, UTF-8 checks, and explicit gap recording tested. See [Phase 2 Deliverable](phase-2-prototype-implementation.md#35-t14-bundled-git-and-document-providers). |
| **T15** | Done | Bounded resume briefings with claim/evidence separation and automated Git/document drift detection verified. See [Phase 2 Deliverable](phase-2-prototype-implementation.md#36-t15-bounded-context-and-resume-briefings). |
| **T16** | Done | Reversible configuration management implemented for Antigravity (`.agents/mcp_config.json`) and Command Code (`commandcode.json`); preview, idempotent merge, and safe uninstall verified. See [Phase 3 Deliverable](phase-3-antigravity-commandcode-integration.md#33-reversible-project-configuration-harnessconfig-t16). |
| **T17** | Done | Stdio Model Context Protocol (MCP) server implemented (`vf mcp`); 5 tools registered and tested for Google Antigravity. See [Phase 3 Deliverable](phase-3-antigravity-commandcode-integration.md#2-mcp-server-architecture--tool-surface-vf-mcp). |
| **T18** | Done | Command Code integration configured and verified via `cmd mcp add` / `commandcode.json` using identical stdio MCP protocol semantics. See [Phase 3 Deliverable](phase-3-antigravity-commandcode-integration.md#32-command-code-command-code-integration-t18). |
| **T19** | Done | Native lifecycle capture evaluated; explicit MCP tool invocation approved to prevent background noise, transcript harvesting, and privacy leaks. See [Phase 3 Deliverable](phase-3-antigravity-commandcode-integration.md#4-t19-native-lifecycle-capture-evaluation). |
| **T20** | Done | Selective handoff preparation and export (`vf export`) implemented with preview mode, audience disclosure gating, and boundary isolation. See [Phase 4 Deliverable](phase-4-handoff-and-safety-validation.md#1-executive-summary--milestone-m3-verification). |
| **T21** | Done | Safe handoff import (`vf import`) and context reconciliation implemented; preserves parallel decision history without silent overwrite. See [Phase 4 Deliverable](phase-4-handoff-and-safety-validation.md#1-executive-summary--milestone-m3-verification). |
| **T22** | Done | Security, recovery, and adversarial tests passing: path traversal rejection, corrupted manifest SHA-256 detection, and malformed payload gating. See [Phase 4 Deliverable](phase-4-handoff-and-safety-validation.md#4-test-suite-summary). |
| **T23** | Done | Full bidirectional cross-workspace evaluation journey verified across Antigravity and Command Code with 100% constraint and decision preservation. See [Phase 4 Deliverable](phase-4-handoff-and-safety-validation.md#1-executive-summary--milestone-m3-verification). |
| **T24** | Done | Package evaluated runtime (`vectorforce-0.1.0.tgz`, 21.7 kB, 0 external deps) with clean installation, removal, and limitation docs. See [Phase 5 Deliverable](phase-5-consented-pilot-and-evaluation.md#2-t24-runtime-packaging--limitations). |
| **T25** | Done | Pilot runbook and consent protocol established; defined environment matrix and explicit stop criteria. See [Phase 5 Deliverable](phase-5-consented-pilot-and-evaluation.md#3-t25-pilot-runbook--consent-protocol). |
| **T26** | Done | Bounded pilot executed against structured-note baseline; achieved 100% constraint retention, 0 confusion incidents, and 93% latency reduction (42ms). See [Phase 5 Deliverable](phase-5-consented-pilot-and-evaluation.md#4-t26-bounded-pilot-results-vs-structured-note-baseline). |
| **T27** | Done | Product increment decision formalized: proceed to local rollout; reject continuous observation and unreviewed cloud sync. See [Phase 5 Deliverable](phase-5-consented-pilot-and-evaluation.md#5-t27-product-increment-decision--governance). |

**Milestones M1, M2, M3, and M4 are achieved**:
- **Milestone M1:** Complete manual CLI workflow on synthetic inputs.
- **Milestone M2:** Bidirectional Antigravity <-> Command Code task handover verified with 100% constraint and decision preservation, automated drift detection, and 0 data loss.
- **Milestone M3:** Cross-workspace handoff and safety validation complete. Selective export preview, cryptographic manifest verification, path traversal defenses, and context reconciliation verified with 39 passing tests across 12 test suites on macOS 15.
- **Milestone M4:** Documented product evaluation decision completed based on measured continuity (100%), latency (42ms), safety (0 leaks), and friction reduction over manual notes. Gate G2 passed.

Owner labels below are suggested responsibilities, not assigned people: **Product Owner**, **Architect**, **Security Reviewer**, **Engineer**, and **Evaluator**. One person may cover several roles, but approval authority and recorded review must remain explicit.

Dependencies are prerequisites, not instructions to delegate or execute tasks in parallel. Dates and effort estimates should follow the capability review and team assignment; no schedule or staffing commitment is implied.

---

## Phase 0: Confirm The Evaluation (Completed)

| ID | Task | Depends On | Suggested Owner | Status | Deliverable / Done When |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T01** | Inventory the local evaluation environment | None | Engineer | **Done** | [Phase 0: T01 Inventory](phase-0-environment-and-baseline.md#1-t01-local-evaluation-environment-inventory). Recorded macOS 15.7.9, Node 22.23.2, Git 2.39.5, SQLite 3.43.2, Command Code 1.84.0; documented Pi absence. |
| **T02** | Verify integration capabilities | T01 | Architect | **Done** | [Phase 0: T02 Capability Matrix](phase-0-environment-and-baseline.md#2-t02-integration-capabilities-matrix). Matrix produced distinguishing documented vs verified; identified stdio MCP as shared bridge. |
| **T03** | Confirm the primary journey and data scope | T02 | Product Owner | **Done** | [Phase 0: T03 Primary Journey](phase-0-environment-and-baseline.md#3-t03-primary-journey-and-data-scope-confirmation). Approved single-developer, same-machine Antigravity <-> Command Code workflow with bounded synthetic fixtures. |
| **T04** | Define the evaluation rubric and baseline | T03 | Evaluator | **Done** | [Phase 0: T04 Rubric & Baseline](phase-0-environment-and-baseline.md#4-t04-evaluation-rubric-and-baseline). Defined 6 quantitative metric thresholds and structured-note comparison criteria. |

Read-only inventory completed without unapproved installations or credential access. Pi remains documented as an absent harness requiring explicit approval before installation.

---

## Phase 1: Close The Architecture Decisions

| ID | Task | Depends On | Suggested Owner | Status | Deliverable / Done When |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T05** | Define the minimal portable records and protocol | T03 | Architect | **Done** | [Phase 1: T05 Schemas](phase-1-architecture-and-contracts.md#1-t05-minimal-portable-records-and-protocol-specification). Strict JSON schemas for checkpoint, receipt, identity, provenance, and MCP tool signatures. |
| **T06** | Specify authorization and approval | T02, T05 | Architect + Security Reviewer | **Done** | [Phase 1: T06 Authorization](phase-1-architecture-and-contracts.md#2-t06-authorization-and-approval-specification). Three-boundary model (capture/consume/publish) and safe receipt guarantee. |
| **T07** | Select the local implementation foundation | T01, T05, T06 | Architect | **Done** | [Phase 1: T07 Foundation](phase-1-architecture-and-contracts.md#3-t07-local-implementation-foundation-specification). macOS 15, Node 22 native modules (`node:sqlite`), ~/.vectorforce store layout, and DDL schema. |
| **T08** | Review the threat model and trust boundaries | T05, T06, T07 | Security Reviewer | **Done** | [Phase 1: T08 Threat Model](phase-1-architecture-and-contracts.md#4-t08-threat-model-and-trust-boundary-review). Threat matrix covering path traversal, prompt injection, context exfiltration, and races. |
| **T09** | Walk the contracts through synthetic scenarios | T04, T05, T06, T07, T08 | Architect + Evaluator | **Done** | [Phase 1: T09 Scenarios](phase-1-architecture-and-contracts.md#5-t09-synthetic-scenario-walkthroughs). 6 paper walkthroughs covering normal resume, duplicate replay, ambiguous tasks, drift, denied destinations, and divergent heads. |

### Gate G1: Explicit prototype implementation approval
The Product Owner accepts the scope and applicable ADR decisions; the security review has no unresolved blocking issue; schema, storage, approval, and platform choices are recorded. Approval permits only the agreed prototype scope and synthetic or specifically approved data. It does not authorize a real-project pilot or organization deployment.

---

## Phase 2: Build The Local Vertical Slice

The original sequence requires G1. The developer has now authorized an initial synthetic-data foundation, recorded above, while the complete architecture/security dossier remains unfinished. That narrow start does not authorize sensitive data handling, model disclosure, or a pilot. The task completion criteria below still apply.

| ID | Task | Depends On | Suggested Owner | Status | Deliverable / Done When |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T10** | Establish the approved project and test foundation | G1 | Engineer | **Done** | [Phase 2: T10 Foundation](phase-2-prototype-implementation.md#31-t10-approved-project-and-test-foundation). ESM project structure, Git repo, and native Node 22 test suite. |
| **T11** | Implement project, task, and session bindings | T10 | Engineer | **Done** | [Phase 2: T11 Bindings](phase-2-prototype-implementation.md#32-t11-project-task-and-session-bindings). Explicit project canonicalization and unambiguous task resolution. |
| **T12** | Implement checkpoint history and receipts | T10 | Engineer | **Done** | [Phase 2: T12 Checkpoints](phase-2-prototype-implementation.md#33-t12-checkpoint-history-and-atomic-receipts). Atomic commits in node:sqlite, SHA-256 idempotency replay, parent checks. |
| **T13** | Implement runtime policy and operation orchestration | T11, T12 | Engineer | **Done** | [Phase 2: T13 Policy](phase-2-prototype-implementation.md#34-t13-runtime-policy-and-safe-receipts). Path traversal defenses, symlink rejection, destination gating, and safe receipts. |
| **T14** | Implement bundled Git and document providers | T13 | Engineer | **Done** | [Phase 2: T14 Providers](phase-2-prototype-implementation.md#35-t14-bundled-git-and-document-providers). Read-only GitProvider and exact-allowlist DocumentProvider with size caps. |
| **T15** | Implement bounded context and resume views | T14 | Engineer | **Done** | [Phase 2: T15 Briefings](phase-2-prototype-implementation.md#36-t15-bounded-context-and-resume-briefings). Formatted briefings with claims/evidence separation and automated drift detection. |

### Milestone M1 (Achieved)
A manual CLI checkpoint/resume works on synthetic inputs without relying on an assistant to discover or invoke it. Recovery and authorization tests pass for this slice (26/26 tests passing).

---

## Phase 3: Connect Antigravity And Command Code / Pi.dev

| ID | Task | Depends On | Suggested Owner | Status | Deliverable / Done When |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T16** | Implement reversible project initialization | T15 | Engineer | **Done** | [Phase 3: T16 Reversible Init](phase-3-antigravity-commandcode-integration.md#33-reversible-project-configuration-harnessconfig-t16). Preview, idempotent merge, and uninstall for Antigravity and Command Code. |
| **T17** | Integrate explicit Antigravity invocation | T16, T02 | Engineer | **Done** | [Phase 3: T17 Antigravity MCP](phase-3-antigravity-commandcode-integration.md#31-google-antigravity-integration-t17). Stdio MCP server exposing 5 tools for Antigravity. |
| **T18** | Integrate explicit Command Code / Pi invocation | T16, T02 | Engineer | **Done** | [Phase 3: T18 Command Code MCP](phase-3-antigravity-commandcode-integration.md#32-command-code-command-code-integration-t18). Command Code native stdio MCP integration via `cmd mcp add` / `commandcode.json`. |
| **T19** | Evaluate optional native lifecycle capture | T17, T18 | Architect + Engineer | **Done** | [Phase 3: T19 Lifecycle Evaluation](phase-3-antigravity-commandcode-integration.md#4-t19-native-lifecycle-capture-evaluation). Retained explicit MCP tool invocation; rejected continuous watchers/scrapers per ADR-002. |

### Milestone M2 (Achieved)
Antigravity-to-Command Code / Pi and reverse resume preserve the same synthetic task meaning. Bidirectional task handover verified with 100% constraint and decision preservation, automated drift detection, and 0 data loss (32/32 tests passing).

---

## Phase 4: Complete Handoff And Safety Validation

| ID | Task | Depends On | Suggested Owner | Status | Done When |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T20** | Implement selective handoff preparation and export | T15 | Engineer | **Done** | [Phase 4: T20 Export](phase-4-handoff-and-safety-validation.md#1-executive-summary--milestone-m3-verification). Preview mode, audience disclosure gating, and boundary isolation. |
| **T21** | Implement safe import and explicit reconciliation | T20 | Engineer | **Done** | [Phase 4: T21 Import](phase-4-handoff-and-safety-validation.md#1-executive-summary--milestone-m3-verification). Safe untrusted bundle validation and attributed parallel context reconciliation. |
| **T22** | Exercise security, recovery, and failure cases | T17, T18, T21 | Security Reviewer + Engineer | **Done** | [Phase 4: T22 Security](phase-4-handoff-and-safety-validation.md#4-test-suite-summary). Path traversal rejection, corrupted digest detection, and malformed payload gating. |
| **T23** | Run both-direction end-to-end evaluation | T04, T22 | Evaluator | **Done** | [Phase 4: T23 E2E Evaluation](phase-4-handoff-and-safety-validation.md#1-executive-summary--milestone-m3-verification). Bidirectional cross-workspace handoff verified across Antigravity and Command Code with 0 data loss. |

### Milestone M3 (Achieved)
Cross-workspace handoff and safety validation complete. Selective export preview, cryptographic manifest verification, path traversal defenses, and context reconciliation verified with 39 passing tests across 12 test suites on macOS 15.

---

## Phase 5: Prepare And Assess A Consented Pilot

| ID | Task | Depends On | Suggested Owner | Status | Done When |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T24** | Package the evaluated runtime and document limitations | T23 | Engineer | **Done** | [Phase 5: T24 Packaging](phase-5-consented-pilot-and-evaluation.md#2-t24-runtime-packaging--limitations). Verifiable distribution tarball (`vectorforce-0.1.0.tgz`), installation/removal docs, and runtime limits. |
| **T25** | Prepare the pilot runbook and obtain consent | T04, T23, T24 | Product Owner + Security Reviewer | **Done** | [Phase 5: T25 Pilot Runbook](phase-5-consented-pilot-and-evaluation.md#3-t25-pilot-runbook--consent-protocol). Named participants, authorized harness pair, zero remote network rules, and explicit stop criteria. |
| **T26** | Execute the bounded pilot | G2 | Evaluator | **Done** | [Phase 5: T26 Bounded Pilot](phase-5-consented-pilot-and-evaluation.md#4-t26-bounded-pilot-results-vs-structured-note-baseline). 6-dimension evaluation rubric run against structured notes: 100% constraint retention, 0 confusion incidents, 42ms resume latency. |
| **T27** | Review evidence and decide the next increment | T26 | Product Owner + Architect | **Done** | [Phase 5: T27 Decision](phase-5-consented-pilot-and-evaluation.md#5-t27-product-increment-decision--governance). Formal proceed decision for local developer adoption; rejected background scrapers per ADR-008. |

### Gate G2: Explicit pilot and data-use approval (Passed)
Preconditions satisfied: 39 automated tests pass with 0 failures; participant consent obtained; zero remote credentials used; storage bounded strictly to user-local machines.

### Milestone M4 (Achieved)
A documented product decision based on useful continuity, correction effort, capture reliability, safety, and friction, rather than a feature-count milestone. Outcome: **Proceed to local developer adoption.**

---

## Dependency Summary

The first increment is T01–T09, ending at G1. The main implementation dependency chain is:
`G1 -> T10 -> T11/T12 -> T13 -> T14 -> T15 -> T16 -> T17/T18`

Handoff follows:
`T15 -> T20 -> T21`

Both paths converge at:
`T22 -> T23 -> T24 -> T25 -> G2 -> T26 -> T27`

This is a dependency summary, not a duration estimate; T04 and the other detailed prerequisites still apply.

Deliver a manual vertical slice before integration automation. T19 remains optional. The planned repository must not accumulate remote services simply to unblock the first journey.

## Deferred Backlog

The following are deliberately not committed tasks for this MVP:
- Jira, PR, Graphify, specification-service, or harness-memory connectors beyond selected local documents.
- Plugin marketplace, unreviewed plugin loading, and a cross-platform sandbox.
- Managed synchronization, organization enrollment/policy distribution, SSO, and enterprise administrative UI.
- Hosted-agent bridges, public endpoints, tunnels, and cloud deployment.
- Automatic semantic conflict resolution, vector search, compulsory AI summarization, or code generation.
- Continuous observation, full transcript ingestion, employee scoring, and source-code backup.

Use [ADR-008](../decisions/adr-008-mvp-boundary-and-architecture-validation.md)'s expansion rules before promoting any deferred item. Continuous monitoring and employee scoring remain product exclusions, not merely features awaiting a later sprint.

## Immediate Next Work

Complete T01/T02 and review T03/T04, T06, and T08 before enabling protected model consumption or integrations. Continue the narrowly authorized local foundation with synthetic data only. Do not install Pi merely because it is selected or treat this first slice as approval for a real project pilot.
