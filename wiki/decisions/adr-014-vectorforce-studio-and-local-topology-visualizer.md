# ADR-014: VectorForce Studio And Local Topology Visualizer

- **Date:** 2026-10-18
- **Status:** Proposed / Implemented for the Meta Muse hackathon build
- **Scope:** Local-first web GUI, interactive architecture topology & blast radius graph, and single-port zero-dependency server
- **[Decision index](../README.md)**
- **Extends:** [ADR-002](adr-002-local-first-checkpoints-and-disclosure-boundaries.md), [ADR-012](adr-012-target-harness-selection-antigravity-commandcode-pidev.md), [ADR-013](adr-013-ai-reasoning-layer-and-provider-authorization.md)

## Context

While VectorForce provides robust underlying infrastructure (SQLite WAL store, deterministic drift engine, MCP bridge, and Meta Llama-powered reasoning service), displaying this functionality solely through terminal output and MCP stdio JSON-RPC streams makes it difficult for judges and stakeholders to grasp the system's real-time capabilities in a 90-second hackathon pitch.

To demonstrate the full potential of an **AI-native engineering memory platform**, VectorForce requires a visual control center that communicates:
1. Continuous project memory and health status.
2. Interactive architectural topology with real-time drift badges and blast radius calculation.
3. An AI reasoning console powered by Meta Llama/Muse with strict Claims vs. Evidence distinction.
4. Historical timeline rivers and safe context handoff boundaries.

## Implemented Decision

Implement **VectorForce Studio** (`vf studio` or `vf ui`), a local-first visual control center consisting of:

1. **Zero-Dependency Single-Port Server (`src/studio/server.js`)**:
   - Implemented exclusively using Node.js built-ins (`node:http`, `node:sqlite`, `node:fs`, `node:path`, `node:url`).
   - Serves structured REST JSON endpoints (`/api/status`, `/api/memory`, `/api/timeline`, `/api/graph`, `/api/reason`, `/api/checkpoint`).
   - Simultaneously serves pre-compiled static frontend assets from `studio/dist` on a single port (`3210` by default), eliminating the need for separate frontend development servers or heavy runtime frameworks.
   - Respects CORS and workspace boundaries.

2. **Interactive Topology & Blast Radius Graph**:
   - Visualizes project modules, categories, owners, status, and dependency edges.
   - Click-to-inspect module drawer displays associated files, governing architectural decisions (ADRs), open tasks, and calculates real-time blast radius across dependent modules.
   - Highlights real-time drift alerts directly on affected nodes.

3. **AI Workspace Console**:
   - Interactive UI for running Llama/Muse reasoning queries (`where did I leave off?`, `architectural risk review`, `what changed since checkpoint?`).
   - Enforces visual fencing between model assertions (`Claims`) and cryptographic ground truth (`Evidence`).

4. **Repository Memory & Timeline**:
   - Aggregates indexed codebase symbols, allowlisted documents, architectural decisions, invariant constraints, and immutable checkpoints.
   - Generates weekly continuity recaps with chronological checkpoint logs.

## Invariants & Security Boundaries

| Invariant | Implementation Rule |
| :--- | :--- |
| **Zero Runtime Dependencies** | The backend server relies strictly on Node.js built-ins. No external npm packages (Express, Fastify, etc.) are introduced into the core runtime. |
| **Local-First Isolation** | Server listens on localhost (`127.0.0.1`) only; no telemetry or project code is transmitted to cloud servers without explicit user intent. |
| **Claims vs. Evidence Distinction** | The UI maintains distinct visual treatments and badges for unverifiable model claims versus cryptographically hashed Git/document evidence. |
| **Workspace Containment** | Static file serving and API operations are strictly contained within the canonical workspace path, preventing path traversal attacks. |

## Verification

- Verified live in browser using subagents at `http://localhost:3210`.
- All 62 automated unit tests across 15 test suites continue to pass (`npm test`).
- Production bundle compiled into `studio/dist` and verified with zero console errors.
