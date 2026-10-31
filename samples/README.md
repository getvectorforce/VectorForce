# VectorForce Samples & Reference Architectures (`samples/`)

This directory contains runnable samples, multi-agent reference architectures, and production integration templates for **VectorForce**.

---

## Available Samples

| Sample | Path | Description | Run Command |
| :--- | :--- | :--- | :--- |
| **01. Cross-Harness Context & Signed Handoff** | [`01-cross-harness-handoff.js`](01-cross-harness-handoff.js) | End-to-end programmatic SDK walkthrough: Antigravity checkpoint -> Meta Muse resume & drift check -> HMAC-SHA256 signed handoff -> Teammate workspace import. | `node samples/01-cross-harness-handoff.js` |
| **02. BistroForce POS — Restaurant Billing Center** | [`Restaurantbiling/`](Restaurantbiling/README.md) | Full-stack zero-DB Restaurant POS & Billing Center built step-by-step across **Google Antigravity**, **Meta Muse (`Muse Spark Open`)**, and **Claude / Command Code**, complete with VectorForce Studio Dashboard & Decision Lineage in its [`README.md`](Restaurantbiling/README.md). | `node --test samples/Restaurantbiling/test/billing.test.js` |

---

## How to Add New Samples or Architectures

When adding a new architecture or sample workflow:
1. Create a self-contained script (`samples/03-<name>.js`) or project folder (`samples/<project-name>/`).
2. Import VectorForce services directly from [`../src/index.js`](../src/index.js) or initialize VectorForce via `vf init`.
3. Include a `README.md` showcasing the **VectorForce Studio Dashboard**, **Architectural Decisions (`DEC-*`)**, and **Who Made Each Decision (Author + Harness)**.
