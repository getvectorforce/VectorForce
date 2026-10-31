# Agent Continuity Protocol — Restaurant Billing Center

This repository uses **VectorForce** ("Git for AI Context") across Google Antigravity, Meta Muse, Claude Code, Command Code, and OpenAI Codex.

## Workflow
1. **Start/Resume Task**: Run `vf tasks active`, `vf drift --task <id>`, and `vf resume --task <id> --dest <harness>` (or MCP tools `list_tasks`, `check_workspace_drift`, `get_resume_briefing`, `reason_about_task`).
2. **Save Checkpoint Before Switching IDE**: Run `vf checkpoint --task <id> --summary "<summary>" --goal "<goal>" --constraint "<constraint>" --decision "<ID>:<Title>:<Rationale>" --next "<next>" --doc "AGENTS.md"` (or MCP tool `save_checkpoint`).
