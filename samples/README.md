# VectorForce Samples & Reference Architectures (`samples/`)

This directory contains runnable samples, multi-agent reference architectures, and production integration templates for **VectorForce**.

---

## Available Samples

| Sample | File | Description | Run Command |
| :--- | :--- | :--- | :--- |
| **01. Cross-Harness Context & Signed Handoff** | [`01-cross-harness-handoff.js`](01-cross-harness-handoff.js) | End-to-end programmatic SDK walkthrough: Antigravity checkpoint -> Meta Muse resume & drift check -> HMAC-SHA256 signed handoff -> Teammate workspace import. | `node samples/01-cross-harness-handoff.js` |

---

## How to Add New Samples or Architectures

When adding a new architecture or sample workflow:
1. Create a self-contained script (`samples/02-<name>.js`) or subfolder (`samples/<architecture-name>/`).
2. Import VectorForce services directly from [`../src/index.js`](../src/index.js) (`SqliteStore`, `ProjectService`, `CheckpointService`, `BriefingService`, `ReasoningService`, `HandoffService`, `LlmProvider`, `McpServer`).
3. Register a convenience script in [`package.json`](../package.json) if it should be part of regular verification.
