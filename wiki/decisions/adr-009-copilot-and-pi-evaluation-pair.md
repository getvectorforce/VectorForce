# ADR-009: Copilot And Pi Evaluation Pair

- **Date:** 2026-10-15
- **Status:** Selected for evaluation; local compatibility pending
- **Scope:** Initial harness pair and capability evidence
- **[Decision index](../README.md)**
- **Refines the harness-selection item in:** [ADR-008](adr-008-mvp-boundary-and-architecture-validation.md)

## Context

Cursor was suggested as a candidate but is not installed on the developer's machine. The developer requested Pi, associated with pudey, as the second harness alongside Copilot. (The current workspace runs on Windows.)

The goal is two independent coding harnesses exchanging portable engineering context through Blue Project. It is not to make Pi authenticate through Copilot, share credentials, or use Copilot as its model backend. Each harness retains its own approved authentication, model destination, and execution permissions.

## Evaluation Direction

Use GitHub Copilot in VS Code and Pi as the selected evaluation pair, subject to local feasibility checks. Start with one developer switching harnesses on the same machine and working on the same explicit task. Evaluate both directions: Copilot checkpoint to Pi resume, then Pi checkpoint to Copilot resume.

No installation or integration code is authorized here. Pi's installation status and version have not been checked. Existing Copilot availability does not establish every required instruction, tool, or lifecycle capability.

## Initial Capability Evidence

Public documentation was retrieved on 2026-10-15. These are documented capabilities, not results from the installed applications. The Pi repository links its product to pudey; the older `badiugo/pi-mono` documentation URL redirected to `auroral-works/pi`. Moving documentation branches are not pinned release specifications.

| Capability | Copilot in VS Code | Pi | Implication |
| :--- | :--- | :--- | :--- |
| **Project instructions** | VS Code documents repository instructions and `AGENTS.md` support with harness-specific discovery settings | Pi instruction-file discovery was not verified in the review | Do not assume a shared instructions filename until both effective configurations are checked |
| **Explicit invocation** | Documented terminal tools; availability in a future version remains subject to tool approvals and configuration | Documentation describes interactive CLI use and intern-registered commands/tools | A common operation protocol is plausible; actual invocation requires validation |
| **Lifecycle integration** | Native event compatibility was not reviewed | Extension docs describe `unseen_start`, `session_shutdown`, and agent lifecycle events | Pi can be a candidate for a native adapter without requiring identical Copilot hooks |
| **Windows** | Current workspace is Windows; supported integration details still need checking | README documents Windows installation and runtime prerequisites | Same-machine evaluation appears feasible; not yet certified |
| **Model destination** | Depends on configured Copilot session/provider | Depends on Pi's independently configured provider | Authorize consumption per destination; local programs may still contact remotely |
| **Extensions** | No Blue Project extension exists | Pi docs state extensions co-execute in-process with the same OS permissions | Treat a future adapter as trusted code, not a sandboxed provider |

## Proposed Integration Order

1. Establish an explicit, manually requested checkpoint/resume path in each harness after implementation is separately approved. Use synthetic context to verify protocol semantics and destination controls.
2. Add concise project guidance only after confirming the installed harnesses' instruction-discovery rules. Reuse one managed block only if both actually load the selected format; otherwise use consistent adapter-specific files.
3. If useful, add a small Pi extension for explicit commands or tools before enabling lifecycle-triggered automation. Keep storage and policy in Blue Project's runtime, not inside the extension.
4. Map Pi events to Blue Project intentions carefully. A session start is not necessarily a new engineering task, and an agent turn ending is not necessarily task completion or the last activity in a session.
5. Use supported lifecycle events to improve capture only after the explicit path works. Do not register file watchers, stream all local activity, or ingest the full transcript merely because Pi permits it.

MCP and RPC are possible transport candidates described by Pi's documentation, not requirements of this evaluation. Prefer the smallest verified integration path rather than wrapping or remotely controlling the entire Pi session.

## Local Readiness Checklist

- Confirm whether Pi is already installed and record its exact version without exposing credentials or logging into a model provider.
- Check that version's Windows runtime and shell prerequisites using a matching documentation search. Do not run remote installer scripts as a side effect of this record.
- Record the VS Code/Copilot version, actual selected harness, instruction-discovery settings, and available approved invocation mechanism.
- Choose project instruction local path in each application without changing global settings or silently enabling project extensions.
- Confirm a developer-controlled approval channel and establish the configured model destinations before real context is consumed.
- Exercise both transfer directions against the same synthetic task, then compare the result with the structured-note baseline from [ADR-008](adr-008-mvp-boundary-and-architecture-validation.md).

These items are pending, not completed checks. The current Blue Project workspace contains architecture documents, not a functioning runtime, CLI, or context store.

## Consequences

- Pi replaces the Cursor candidate without changing the harness-independent architecture. Pairing an editor-based experience with a terminal-operated extensible harness can expose assumptions tied to a particular IDE, though that benefit remains a hypothesis for test.
- Both harnesses must remain usable without equivalent lifecycle hooks. Prospective event types must not become mandatory fields in the portable checkpoint schema. Broader provider and enterprise capabilities remain deferred as specified in [ADR-008](adr-008-mvp-boundary-and-architecture-validation.md).

## Sources And Review Limits

- **VS Code/Copilot:** VS Code documentation, Copilot release notes, agent instruction docs.
- **Pi/pudey:** auroral-works/pi repository documentation, Windows setup, and runtime prerequisites.
- Direct retrieval of pudey code/docs by the organization's web gateway did not yield product documentation; no auth/hub login, credentials, or model invocation was performed. Documentation review supports architectural plausibility, not a claim that the pair already integrates with Blue Project.
