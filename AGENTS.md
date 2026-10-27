# Agent Context Sharing & Continuity Guidelines (VectorForce)

This project uses **VectorForce** as a local-first, privacy-preserving engineering context platform ("Git for AI context").

## 1. Context Protocol Workflow

Whenever you are working in this repository (in Google Antigravity, Command Code, Meta Muse, or OpenAI Codex):

### At the Start of a Task / Resuming Work:
1. **Discover active tasks:**
   - Call MCP tool: `list_tasks({ status: "active" })`
   - Or CLI: `node bin/vf.js tasks active`
2. **Check for workspace or document drift:**
   - Call MCP tool: `check_workspace_drift({ task_id: "<task_id>" })`
   - Or CLI: `node bin/vf.js drift --task <task_id>`
3. **Retrieve the authorized briefing:**
   - Call MCP tool: `get_resume_briefing({ task_id: "<task_id>", destination_harness: "antigravity" })` (use your harness: `"antigravity"`, `"codex"`, `"command-code"`, or `"muse-code"`)
   - Or CLI: `node bin/vf.js resume --task <task_id> --dest antigravity`
4. **Reason over the context (AI memory):**
   - Call MCP tool: `reason_about_task({ task_id: "<task_id>" })`
   - Or CLI: `node bin/vf.js reason --task <task_id>` (alias: `node bin/vf.js continue`)
   - Produces a Llama-generated narrative: where you left off, what changed since the checkpoint, architectural risks, and ranked next actions. Requires a configured provider (`VF_LLM_*` cloud Llama/Muse or `VF_OLLAMA_*` local); it degrades to the deterministic briefing when unavailable.
5. **Adhere to Invariant Constraints:** Respect all non-negotiable constraints listed under the briefing's `# Invariant Constraints` section.

### At the End of a Task Phase / Before Switching Harnesses:
1. **Capture an immutable checkpoint:**
   - Call MCP tool: `save_checkpoint({ task_id, summary, goals, constraints, decisions, next_steps, requested_documents })`
   - Or CLI:
     ```bash
     node bin/vf.js checkpoint --task <id> --summary "<summary>" \
       --goal "<goal>" --constraint "<constraint>" \
       --decision "<ID>:<Title>:<Rationale>" \
       --next "<next_step>" --doc "<allowlisted_doc.md>"
     ```
2. **Verification Receipt:** Ensure the operation receipt returns `status: "committed"`.

---

## 2. Security & Policy Invariants

- **Claims vs Evidence Distinction:** Goals, constraints, and decisions are model assertions (`claims`). Git commits and document hashes are verifiable observations (`evidence`). Never confuse an unverified model claim with ground truth.
- **Strict Document Allowlists:** Only files registered in the project allowlist (`node bin/vf.js policy list`) can be collected as document evidence. Never attempt path traversal outside the workspace.
- **Safe Receipts:** Receipts never contain document bodies or private credentials.
