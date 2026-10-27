# ADR-001: Event-Driven, Harness-Independent Context Architecture

- **Date:** 2026-10-15
- **Status:** Accepted in principle
- **Scope:** Product boundaries and architectural direction
- **[Decision index](../README.md)**

## Context

Engineering context is fragmented across AI coding harnesses, Git, specifications, project documentation, issue trackers, PRs, and conversations. Developers need continuity across tools and people without continuously monitoring their machines or unnecessarily uploading source code.

**Blue Project** is the working product name. Its purpose is to version and transfer engineering understanding, not generate code or supervise developer activity.

## Decision

Use explicit, event-driven collection rather than continuous machine observation. Harness integrations and developers request operations at task start, context changes, meaningful checkpoints, session completion, and handoff. These are trigger intentions, not guaranteed events in every harness.

Make the core protocol independent of any IDE or assistant. Separate these responsibilities:

| Component | Responsibility |
| :--- | :--- |
| **Harness adapter** | Translate supported lifecycle events or assistant requests into protocol operations |
| **Local runtime** | Apply policy, coordinate collection, normalize evidence, and create context records |
| **Context provider** | Retrieve scoped evidence from an approved source |
| **Local store** | Preserve context history and references |
| **Optional synchronization** | Transfer approved context to authorized recipients |

Project instruction files provide a broad, best-effort integration path. Native hooks improve reliability where available. Explicit CLI operations remain the fallback. Instruction text is neither a reliable event bus nor a security boundary.

## Proposed Protocol And Extensions

The conceptual operations are `context`, `resume`, `checkpoint`, `handoff`, and `end`. Command spelling and the earlier `vf` prefix are not finalized. A CLI and optional MCP interface should share semantics and a versioned context schema.

Requests should carry operation, project, task, and session identities. Retries should be idempotent, and results should distinguish success, partial completion, denial, and failure.

Session-end capture must be best effort because cancellation and crashes can prevent it.

Providers should declare capabilities and required access, then return normalized evidence with provenance. Initial candidates are Git metadata and selected project documents. Later candidates include specifications, Graphify-derived indexes, supported harness memories or conversation exports, Jira, and PR systems. Availability and supported APIs require validation.

Plugins execute code. Signing, pinned versions, enterprise allowlists, and enforceable process isolation should be evaluated; a permission manifest alone does not restrict execution.

Avoid scraping undocumented IDE storage.

## Consequences

- No background watcher is required; the local runtime may execute on demand.
- Broad integration is possible, but automation quality varies by harness.
- Missing or ignored triggers mean context history may be incomplete.
- Local content is not inherently trusted; retrieved text must not authorize commands or policy changes.
- Remote providers still require network access, scoped credentials, and collection permission.
- Enterprise adoption requires understandable collection rules, audit, retention, offline behavior, and centrally enforceable restrictions.

## Open Questions

- Which two harnesses should establish the initial interoperability contract?
- Which native lifecycle hooks are supported and sufficiently reliable?
- What is the minimum provider contract and isolation mechanism?
- Should the initial protocol expose MCP alongside the CLI or add it later?

## Suggested First Scope

Validate a local checkpoint store, a versioned protocol, two harness integrations, Git/document providers, and explicit export/import. Defer a marketplace, continuous synchronization, and an independent agent. This is a recommendation, not an implementation commitment.
