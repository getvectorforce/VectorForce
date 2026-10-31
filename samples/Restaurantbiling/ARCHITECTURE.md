# Restaurant Billing Center — Architecture & Step-by-Step Plan

## 1. Overview
A clean, zero-database Restaurant POS & Billing Center demonstrating how **VectorForce** preserves engineering decisions, constraints, and context across multiple AI coding tools (**Google Antigravity**, **Meta Muse**, **Claude Code / Command Code**, and **OpenAI Codex**).

## 2. System Boundaries
- **Backend (`backend/`)**:
  - `backend/menu-data.js`: Curated restaurant menu (Starters, Mains, Wood-Fired Pizza, Beverages, Desserts) and valid promo codes (`WELCOME10`, `FEAST20`).
  - `backend/billing-engine.js`: Pure, deterministic billing engine (calculates line-item subtotals, promo discounts, 5% GST tax, and grand total with 2-decimal precision; stores active/paid bills in memory).
  - `backend/server.js`: Zero-dependency Node.js HTTP server (`http://127.0.0.1:4000`) serving both the REST API and the static `frontend/` POS interface.
- **Frontend (`frontend/`)**:
  - `frontend/index.html`, `frontend/styles.css`, `frontend/app.js`: Interactive Restaurant POS where staff/customers browse categories, add items to the table order, apply promo codes, generate an itemized bill receipt, and mark bills as paid.

## 3. REST API Contract (`http://127.0.0.1:4000`)
- `GET /api/menu` -> Returns `{ categories, items, promoCodes }`.
- `POST /api/bills/preview` -> Body `{ items: [{ id, qty }], promoCode }` -> Returns calculated breakdown `{ subtotal, discount, taxRate, taxAmount, grandTotal, lineItems }`.
- `POST /api/bills` -> Body `{ tableNumber, customerName, items, promoCode, paymentMethod }` -> Creates and stores a finalized bill with unique invoice number (`INV-1001`).
- `GET /api/bills` -> Returns all recent bills and daily revenue summary.

## 4. Multi-Harness Step-by-Step Workflow
- **Step 1 (Google Antigravity)**: Initialize VectorForce (`vf init`), build the Backend Billing Engine & REST API (`backend/`), verify unit tests (`test/billing.test.js`), and capture **Checkpoint #1**.
- **Step 2 (Switch IDE / CLI — Meta Muse, Claude Code, Command Code, or Codex)**: Run `vf resume` / `vf reason`, build the Interactive POS Frontend (`frontend/`), and capture **Checkpoint #2**.
- **Step 3 (VectorForce Studio & README Showcase)**: Launch `vf studio`, inspect the topology graph and decision timeline, and embed the Studio dashboard & decision log in `README.md`.

