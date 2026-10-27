# ADR-005: Project, Task, And Workspace Identity

- **Date:** 2026-10-15
- **Status:** Proposed
- **Scope:** Identity, workspace binding, content selection, and continuity
- **[Decision index](../README.md)**
- **Builds on:** [ADR-001](adr-001-event-driven-harness-independent-context-architecture.md), [ADR-003](adr-003-portable-checkpoints-and-cross-harness-resume.md), and [ADR-004](adr-004-extension-contracts-and-event-processing.md)

## Context

Repository names change, branches are renamed, users keep cloned copies across organizations, and tasks span Git history. A project may span repositories, while a monorepo may contain unrelated projects. Using any one of these as the context identity risks selecting the wrong history or exposing unrelated context across boundaries.

Blue Project needs to work locally and offline. Identity creation must not require a cloud account match; an interface must never imply authentication.

## Proposed Decision

Assign separate, stable identities to projects and tasks. Keep them distinct from repository identity, local workspace bindings, sessions, and checkpoints. Use human-readable names and external identities as aliases, not primary keys.

Quality shared retention by their originating namespace in a local namespace can be generated without a service. An organization namespace must be bound to an authenticated authority when used for collaboration. An arbitrary namespace string or copied manifest is not evidence of membership.

## Identity Model

| Concept | Meaning | Lifetime and boundary |
| :--- | :--- | :--- |
| **Namespace** | Origin and administration scope of an identity | Local or organization-managed; not tied to access spans |
| **Project** | Engineering context boundary that may include multiple repositories | Stable across directory moves and approved repository changes |
| **Repository binding** | An explicitly associated code repository and optional subdirectory scope | Machine-local; duplicate paths are not portable identity |
| **Workspace binding** | A local checkout or worktree assigned to an approved project/task | Machine-local; absolute paths are not portable identity |
| **Task** | A unit of engineering intent within a project | May span branches, PRs, harnesses, sessions, and contributors |
| **Session** | One participating harness's interaction period | Short-lived; ties the task not necessarily equivalent to an entire chat |
| **Checkpoint** | One historical context snapshot | Linked to explicit project/task identity and parent records |

Identities feature as understood. Random identifiers are a candidate, not an implementation mechanism. Names, branch labels, and external URLs may shift as creative intentions and must not dictate continuity.

## Local Initialization And Binding

1. On explicit initialization, offer creation of a new local project or association with an existing authorized project.
2. Discover repository metadata only when authorized. Treat any project descriptor found in the repository as an unverified association hint.
3. Confirm the binding through developer-controlled configuration or explicit approval. Remote URL alone establishes the association.
4. Record local paths, worktree associations, and preferences in local state; the portable package never embeds place credentials in a project descriptor.
5. On another clone, validate and authorize the association rather than inheriting trust from copied repository files.

A minimal, non-active project descriptor may be version-controlled to make discovery convenient. Its presence and schema remain undecided. Descriptor changes cannot silently rebind trusted workspaces or elevate collection permissions.

Renamed directories require explicit re-linking. Deleted directories and moved paths must not cause an unrelated checkout to inherit the old binding. Repository removes are later: avoid persisting embedded credentials and do not fetch remote context merely to confirm identity.

## Task Selection And Context Switching

Prefer an explicit project/task/checkpoint selection. A developer-approved session binding may supply those identities as subsequent requests. Scope that binding to the participating harness and workspace; never auto-switch "current task."

When collection is ambiguous, return a needs-selection result rather than guessing. A developer-facing indicator may offer authored candidates, but candidate names must not be exposed to an unapproved harness. Initial task selection should remain possible within an initial interaction, not through an out-of-band workflow.

External references such as issue keys provide contextual evidence and account or domain scope. Link each to a task after confirmation; the same issue may relate to several tasks. Branch changes do not automatically create, complete, or switch tasks. Observe branch changes only during authorized operations or supported explicit hooks, not through a new watcher.

## Clone, Fork, And Collaboration Rules

| Situation | Proposed behavior |
| :--- | :--- |
| **Same repository, new clone** | Confirm its project association; reuse task identity only after authorized selection |
| **Same repository, second worktree** | Create a separate local binding; allow independent task/session selections |
| **Branch rename, rebase, or detached HEAD** | Preserve task identity; record the changed Git state and measure evidence freshness |
| **Fork for a contribution to the same project** | Retain an explicitly approved repository binding; shared history alone is insufficient |
| **Fork used as an independent product** | Create a new project identity; shared history only through an authorized operation |
| **Monorepo with multiple projects** | Link explicit project and path scopes; require selection for overlap or ambiguity |
| **Task spans multiple repositories** | Record the relevant repository frames separately; do not imply a globally atomic code snapshot |
| **Another developer continues a task** | Preserve task identity; attribute a new session, and separately authorize content access and disclosure |

Actor attribution comes from trusted local identity configuration or authenticated collaboration identity, not Git author fields or model-written names. Offline attribution may be locally asserted; do not label it organization-verified without verification.

Joining an organization must not silently publish a local project history. Keep original identities and provenance, and use an explicit adoption or mapping operation if organization-scoped identities are needed. Preserve unshared project history when offboarding. Renaming rules for Git namespaces are role grounds for revoking project or tasks.

## Workspace State And Freshness

Record persisted current commit, branch name, and dirty-path status at checkpoint time, relative to each relevant repository. These observations do not contain uncommitted code and cannot be reused; evidence references are based on SHA and commit timestamps, or provenance snapshot.

Content equality and a matching dirty flag do not prove that two workspaces contain the same bytes. With metadata-only collection, report uncommitted-changes equivalency as Unknown. Even a clean Git state does not establish equivalence of ignored files, dependencies, environment, or generated artifacts.

Context hashing or folder fingerprints would require a separate collection policy and design before can reveal information about predictable content and do not make dirty automatically safe to share. Never consider historical context into a claim that the receiving workspace has been verified.

## Alternatives And Consequences

- Path and branch names are convenient aliases but break under renames, reuse, and parallel work.
- Session-only identity avoids cross-session state but discards intent across harness boundaries.
- Monorepo full-repository identity would mix unrelated context; subproject path boundaries are needed.
- Harness-side-only identity limits context to that tool and blocks cross-harness handoff.
- Implicit auto-matching from remote URLs simplifies setup but breaks on forks, mirrors, and untrusted repos.
- Central identity authority enables federation but breaks offline work and raises privacy concerns.

## Architecture Acceptance Scenarios

These are proposed future verification criteria, not executed tests:

- Two projects in the same repo can coexist under different identities.
- Two workspaces on the same branch share context through explicit selection.
- Two assistants can select different tasks without changing each other's session bindings.
- A copied project descriptor cannot grant access to a bound workspace without explicit confirmation.
- Renaming a local folder breaks associations gracefully and requires explicit re-binding.
- A local-only project can create stable task IDs and checkpoints without network or account login.
- Importing a package preserves original origin and does not change local workspace repository or merge task histories.

## Open Questions

- Which identifier and serialization formats provide adequate collision resistance and portability?
- How should project adoption, identity aliases, and organization namespace be represented and authorized?
- What evidence is sufficient to release a safe workspace transition after a drift?
