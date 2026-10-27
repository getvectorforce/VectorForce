# ADR-002: Local-First Checkpoints And Disclosure Boundaries

- **Date:** 2026-10-15
- **Status:** Accepted in principle; detailed permission model proposed
- **Scope:** Checkpoint creation, provenance, and sharing
- **[Decision index](../README.md)**

## Context

Git can describe changes but cannot reliably recover intent, rejected alternatives, blockers, or the next action. Assistant recollections provide useful meaning but may contain unsupported claims. Context itself can expose sensitive information even when it contains no source code.

## Decision

Use hybrid checkpoints: the harness submits structured engineering context, while Blue Project independently collects permitted evidence. Preserve the distinction between assistant-reported claims, observed facts, and human-approved decisions.

Save checkpoints to private local history under preapproved collection rules. Sharing requires separate, explicit approval. Do not introduce continuous monitoring to automate capture.

For example, an assistant's statement that tests passed remains a reported claim unless supported by captured verification evidence. Any evidence must identify the workspace state to which it applies.

## Proposed Permission Model

| Permission | Question |
| :--- | :--- |
| **Capture** | What may be collected and persisted locally? |
| **Consume** | Which harness or model may receive selected context? |
| **Publish** | Which people or teams may receive an exported package? |

Returning context through a local CLI or MCP tool to a cloud-hosted assistant is an external disclosure. A local transport does not establish a local processing destination.

Destination trust must come from developer-controlled configuration or organization policy, not an assistant's assertion. Unknown destinations should receive no protected content until approved. How a bounded approval may cover repeated consumption remains undecided.

## Security And Enterprise Implications

- Prefer metadata-only defaults and explicit content allowlists. Redaction and secret scanning reduce risk but cannot guarantee safe disclosure.
- Store credentials outside repositories and packages, using an OS credential store.
- Keep local history outside automatically synchronized or repository-tracked locations by default. "Local" must not silently mean a cloud-synced folder.
- Summarization is optional. Any model-based transformation requires an authorized processing destination and data scope.
- Source read permission does not automatically grant permission to redistribute its contents.
- Organization restrictions must not be weakened by project configuration or assistant requests.
- Encryption, recipient authorization, audit, retention, deletion, and offboarding are requirements for evaluating team synchronization.
- Access revocation cannot reliably retract plaintext already exported. End-to-end encryption also constrains server-side search and inspection.

Blue Project can control its own disclosures, not every action of a harness with unrestricted filesystem access. Strong isolation requires OS or harness enforcement beyond this protocol.

## Proposed Onboarding

1. Install a signed CLI and initialize in local-only mode.
2. Detect supported harnesses and preview instruction changes before applying them.
3. Insert only a small, managed, removable section; preserve existing instructions.
4. Enable approved Git metadata and selected documents, then preview the first checkpoint.
5. Demonstrate capture and resume before requesting remote-service access.
6. Enable each remote provider and team-sharing destination separately with scoped consent.

Initialization should be repeatable. Upgrades should preserve user content, and uninstall should remove only managed integration. Diagnostics should explain missing capabilities or denied access without exposing secrets.

## Open Questions

- What approval interface remains outside assistant control?
- How are trusted destinations identified and bound to actual data routing?
- What local retention and encryption defaults are appropriate?
- How should derived summaries inherit source classifications and sharing restrictions?
