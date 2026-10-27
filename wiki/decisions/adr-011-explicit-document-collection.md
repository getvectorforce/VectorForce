# ADR-011: Explicit Document Collection

- **Date:** 2026-10-15
- **Status:** Implemented for the synthetic-data local prototype; broader security review pending
- **Scope:** Exact-path local document collection, limits, provenance, and retry behavior
- **[Decision index](../README.md)**
- **Extends:** [ADR-010](adr-010-local-prototype-foundation.md); contributes to T14 in the [task plan](../planning/mvp-task-breakdown.md)

## Context And Authorization

The developer authorized the next slice: explicit local document collection with path allowlists, size limits, and provenance. Testing remains synthetic-data-only. This does not authorize reading real project documents, model disclosure, Pi installation, network providers, or background collection.

The local checkpoint runtime already separates reported claims from observed Git evidence. Document collection must preserve that distinction: observing a document's bytes does not establish that its statements are true or approved.

## Implemented Decision

Store a separate exact-path allowlist per project, empty by default, outside project-controlled configuration. The `documents-policy` command replaces it using a bounded version-1 JSON input. A checkpoint may request a subset through its documents list but may not configure or expand the allowlist itself.

Validate the entire requested selection against current policy before starting fresh Git or document collection. An unauthorized selection rejects the checkpoint transaction. Allowed paths that cannot be safely read produce explicit per-source gaps in the stored evidence. Those gaps remain visible in a prepared local briefing; a successful checkpoint does not imply complete evidence coverage.

## Data And Filesystem Boundaries

| Boundary | Implemented behavior |
| :--- | :--- |
| **Selection** | At most eight unique exact paths; no globbing, recursive discovery, or linked-source fetching |
| **Path syntax** | Workspace-relative forward-slash paths ending in `.md` or `.txt`; reject hidden segments, traversal, invalid Windows path syntax, device names, and alternate streams |
| **Policy matching** | Exact case-sensitive strings; selection order is canonicalized for idempotency |
| **Link handling** | Reject symbolic links/junctions in path components, multi-link files, directories, and other non-regular candidates |
| **Containment** | Canonical workspace binding and resolved document must remain within the approved workspace; inspect descriptor/path identity and pre/post-read metadata |
| **Size** | At most 8 KiB per file and 64 KiB total document bytes total, separately from the 64 KiB checkpoint-request limit |
| **Format** | Strict UTF-8, rejecting NUL-containing content; no Markdown rendering or embedded-code execution |
| **Read behavior** | Bounded reads, non-follow/nonblocking flags where supported, and descriptor cleanup; no filesystem watcher or source mutation |
| **Provenance** | Relative path, byte count, exact-byte SHA-256, provider/version, collection time, source modification time, and untrusted-content label |

The format/extension restrictions are not a secret scanner or content classifier. A permitted Markdown document can still contain source code, credentials, or proprietary details. Explicit selection and policy do not make arbitrary material safe to disclose.

## Persistence And Compatibility

An additive document policy table stores project allowlists. Existing version-1 stores acquire it on open; the change does not rewrite checkpoint history or advance the store format. Existing requests without documents retain their normalized request hashes. Legacy checkpoints without document evidence remain resumable.

Selected document paths participate in the operation fingerprint. Equivalent reordered selections retry identically; changed selections conflict under the same operation ID. A committed retry returns the original receipt without rereading sources or requiring current collection permission. The receipt contains no document content or evidence body, and returning it is not new authorization to consume the snapshot.

Revoking a path blocks new collection but does not delete old checkpoints or briefing files. Data removal, retention, and model-consumption authorization remain future work. Near checkpoint content is persisted with an operation receipt in its existing transaction.

## Security Limits

This prototype trusts the local user. The policy command is not independently authenticated and is not a hardened developer-approval interface. Another process or unrestricted harness with the same filesystem rights can alter policy or read plaintext snapshots. Do not expose the policy command as an assistant-controlled means to grant itself permission.

Canonical path checks, single-link rules, bounded reads, and descriptor checks reduce ordinary escapes. They are not a platform sandbox and do not eliminate every race involving a hostile process changing filesystem entries concurrently. Slow filesystem operations also do not have a guaranteed wall-clock cancellation deadline. Sensitive or adversarial workspaces remain out of scope pending the security design.

Document evidence is stored as data. It cannot install providers, change policy, invoke commands, or cause automatic URL retrieval through the provider. Resumes with an explicit untrusted-document warning and still prepare only a local model-visible delivery is not implemented.

## Verification

- The complete suite passes 32 tests with no failures or skips on the current Windows machine. New checks cover default allowlist behavior, request/policy separation, source provenance, no receipt content leakage, unquoted-preserving retries, policy revocation and persistence, cross-project isolation, invalid path syntax, oversized and invalid text, junction/hard-link rejection, directories, and canonicalized selection order.
- The CLI journey verifies denied collection before configuration, explicit policy replacement, checkpoint capture, local resume preparation without printing content, and denial of new collection after revocation. Tests created and cleaned up temporary synthetic files only. No real project content or model provider was used.
- These tests do not establish hostile-filesystem race immunity, a trusted approval UI, cross-harness usability, or enterprise readiness.

## Follow-Up

Complete current-workspace freshness checks and local data removal, then establish a trustworthy consumption approval boundary before exposing briefing bodies to Copilot or Pi. T14 remains in progress because the broader provider contract and authenticity/cancellation behavior are not complete.
