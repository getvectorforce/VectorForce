# ADR-013: AI Reasoning Layer And Model Provider Authorization

- **Date:** 2026-10-18
- **Status:** Proposed / Implemented for the Meta Muse hackathon build
- **Scope:** Llama-powered reasoning over engineering memory, codebase grounding, and model-provider disclosure
- **[Decision index](../README.md)**
- **Extends:** [ADR-002](adr-002-local-first-checkpoints-and-disclosure-boundaries.md), [ADR-011](adr-011-explicit-document-collection.md), [ADR-012](adr-012-target-harness-selection-antigravity-commandcode-pidev.md)

## Context

VectorForce records **claims** (goals, constraints, decisions, next steps, open questions) and
**evidence** (Git commits, hashed documents, drift) as immutable checkpoints, and renders a
deterministic resume briefing. This is high-quality infrastructure, but it contains no model
reasoning: the briefing is a rule-based Markdown assembly and drift is a hash/commit comparison.

For the Meta Muse AI Hackathon the product needs a capability that is unmistakably AI and
unmistakably Meta — an **AI Engineering Memory** that reasons over the project's history and
current code with Llama. The wiki previously recorded that "no cloud provider ... has been
authorized"; this ADR records the hackathon-scoped authorization to add a reasoning layer and a
model provider, along with the disclosure boundaries it must respect.

## Implemented Decision

Add a reasoning layer, `ReasoningService`, surfaced through a `vf reason` / `vf continue` CLI
command and a `reason_about_task` MCP tool. The layer **reuses** `BriefingService.generateBriefing`
for the deterministic base (checkpoint selection, drift, document states) and adds:

1. **`LlmProvider`** — a single OpenAI-compatible chat client built on the global `fetch`
   (no runtime dependency). Supports a cloud endpoint (Meta Llama / Muse models) and a local
   Ollama runtime through the same `/chat/completions` shape.
2. **`CodeIndexProvider`** — a deterministic, containment-safe structural index of the workspace
   (files, exported symbols, import edges) plus lexical relevance selection of the files that
   matter for the task, including files changed since the checkpointed commit.
3. **Prompt assembly** that labels every input as `[CLAIMS]`, `[EVIDENCE: ...]`, `[CODE: ...]`,
   or `[UNTRUSTED DOC REFERENCE]`, and requires a fixed Markdown output (where you left off, what
   changed, architectural risks, recommended next actions, open questions, confidence & gaps).

AI output is treated as a **claim**: it is labelled model-generated and unverified, is never
written into `evidence`, and is never persisted as a checkpoint.

## Provider And Disclosure Boundaries

| Boundary | Implemented behavior |
| :--- | :--- |
| **Provider selection** | `VF_LLM_PROVIDER` = `openai` (cloud) or `ollama` (local); implicit `openai` when `VF_LLM_API_KEY` is set, otherwise `ollama` |
| **Cloud endpoint** | `VF_LLM_BASE_URL` (OpenAI-compatible) + `VF_LLM_API_KEY` + `VF_LLM_MODEL`; a cloud provider without a base URL or key is rejected with `LLM_CONFIG_INVALID` |
| **Local endpoint** | `VF_OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`) + `VF_OLLAMA_MODEL` (default `llama3.1:8b`) |
| **Code disclosure** | `VF_LLM_ALLOW_CODE=false` or `--no-code` keeps source out of the prompt; the default may be local-only |
| **Secret exclusion** | The index never reads `.env*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*credentials*`, `*secret*`, `id_rsa*`, or `.npmrc` |
| **Workspace containment** | The index walks only the canonical workspace, follows no symlinks, and rejects any path outside it |
| **Bounded context** | File/size caps and a byte budget bound the prompt deterministically |
| **Degradation** | Any provider error degrades to the deterministic briefing; the command exits successfully rather than failing |

## Persistence And Compatibility

The reasoning layer is **read-only with respect to the store**: it introduces no schema change,
no migration, and no new tables. It consumes checkpoints and Git state that already exist. The
additive `Authorizer.isWithinWorkspace` helper and `GitProvider.collectChangedFiles` are
authorized as part of this decision. Existing CLI commands, MCP tools, and stored data are
unaffected; harnesses that do not pass a `ReasoningService` continue to work, and `vf resume`
remains the deterministic fallback.

## Consequences

- The project can demonstrate visible AI reasoning (narrative continuation, drift-aware risk
  analysis, ranked next actions) on top of its existing engineering-memory pipeline.
- The zero-runtime-dependency invariant is preserved; the reasoning layer adds no third-party
  packages.
- Cloud disclosure is now a first-class, explicitly configured capability rather than an implicit
  behavior; local Ollama keeps the local-first, privacy-preserving default intact.

## Open Questions

- Should generated insights be persisted (`vectorforce/insight/v1`) so `vf recap` can aggregate
  them, and if so under what retention and disclosure policy?
- What is the right default token budget and context size for effective reasoning without
  exhausting the destination model's context?
- Should embeddings be introduced (still dependency-free via a provider endpoint) to strengthen
  semantic code retrieval beyond the current lexical symbol/graph matching?
