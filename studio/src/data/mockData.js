export const initialProjectData = {
  project: {
    id: "proj-c16f3afcb5712bc2",
    name: "VectorForce Studio",
    tagline: "AI Engineering Memory for Coding Agents",
    canonical_path: "/Users/omprakashprajapat/AgentAI/VectorForce",
    created_at: "2026-10-15T09:00:00.000Z"
  },
  ai: {
    connected: true,
    provider: "meta-muse",
    model: "llama-3.3-70b-versatile",
    latency: "184ms",
    contextWindow: "128k"
  },
  health: {
    score: 94,
    status: "Healthy",
    driftDetected: false,
    memoryIntegrity: "Verified",
    harnessesConnected: ["Google Antigravity", "Command Code"]
  },
  stats: {
    filesIndexed: 48,
    symbolsIndexed: 1420,
    allowlistedDocs: 6,
    checkpointsCount: 14,
    decisionsCount: 8,
    activeTasks: 3
  },
  tasks: [
    {
      task_id: "phase-5-pilot",
      title: "AI Engineering Memory & Reasoning Layer (Meta Muse Hackathon)",
      status: "active",
      updated_at: "Just now",
      head_checkpoint: "16372985-22a9-4bad-8125-3bcfbc795f53"
    },
    {
      task_id: "feat-oauth",
      title: "OAuth2 with PKCE Flow & Ed25519 Signing",
      status: "active",
      updated_at: "2 hours ago",
      head_checkpoint: "66bb6165-28ad-4f27-80a6-ab7e5aa52fe8"
    },
    {
      task_id: "phase-4-handoff",
      title: "Cross-Harness Handoff & Safe Reconciliation",
      status: "completed",
      updated_at: "Yesterday",
      head_checkpoint: "86ae9227-aed7-4f31-9425-ae98986bfd83"
    }
  ],
  decisions: [
    {
      id: "DEC-AI-1",
      title: "OpenAI-compatible provider abstraction",
      rationale: "Unified fetch-based chat client for cloud Meta Llama / Muse and local Ollama with zero external runtime dependencies.",
      taskId: "phase-5-pilot",
      timestamp: "2026-10-18T05:04:46Z"
    },
    {
      id: "DEC-AI-2",
      title: "Ephemeral AI reasoning view",
      rationale: "Reasoning adds no schema change or mutable tables; it remains a read-only semantic synthesis view over immutable checkpoints.",
      taskId: "phase-5-pilot",
      timestamp: "2026-10-18T05:04:46Z"
    },
    {
      id: "DEC-AI-3",
      title: "Deterministic briefing fallback",
      rationale: "On model failure or offline mode, degrades cleanly to rule-based briefing rather than failing.",
      taskId: "phase-5-pilot",
      timestamp: "2026-10-18T05:04:46Z"
    },
    {
      id: "DEC-AUTH-01",
      title: "SHA-256 Code Challenge",
      rationale: "RFC 7636 compliance for public client authorization flow without third-party auth SDKs.",
      taskId: "feat-oauth",
      timestamp: "2026-10-17T18:34:20Z"
    },
    {
      id: "DEC-HANDOFF-01",
      title: "Cryptographic Handoff Bundle",
      rationale: "Single-file JSON envelope containing SHA-256 manifest and safe receipts without document traversal risks.",
      taskId: "phase-4-handoff",
      timestamp: "2026-10-17T18:09:41Z"
    },
    {
      id: "DEC-MCP-02",
      title: "Daemon Lifecycle Decoupling",
      rationale: "Decoupled stdio stream shutdown from standard CLI exit; binds cleanup solely to SIGINT/SIGTERM.",
      taskId: "phase-3-complete",
      timestamp: "2026-10-17T17:51:04Z"
    }
  ],
  constraints: [
    "AI output is an unverified claim and must never be written into ground-truth evidence",
    "Zero external runtime dependencies (Node.js built-ins plus global fetch only)",
    "Strict document allowlist policy before any file content is captured",
    "Safe receipts only: receipts never contain sensitive document bodies or private tokens",
    "Preserve Claims vs Evidence distinction across all harnesses"
  ],
  checkpoints: [
    {
      id: "16372985-22a9-4bad-8125-3bcfbc795f53",
      task_id: "phase-5-pilot",
      timestamp: "Today, 10:34 AM",
      author: "omprakashprajapat (Command Code)",
      summary: "Built the AI Engineering Memory reasoning layer (vf reason / reason_about_task) for the Meta Muse hackathon: LlmProvider, CodeIndexProvider, and ReasoningService with deterministic fallback.",
      commit: "6593b6f",
      branch: "main",
      status: "committed",
      goals: ["Ship AI reasoning layer", "Zero runtime dependencies"],
      decisions: ["DEC-AI-1", "DEC-AI-2", "DEC-AI-3"],
      drift: false
    },
    {
      id: "66bb6165-28ad-4f27-80a6-ab7e5aa52fe8",
      task_id: "feat-oauth",
      timestamp: "Yesterday, 7:04 PM",
      author: "agent (Google Antigravity)",
      summary: "OAuth2 PKCE initial architecture committed via live MCP; verified Ed25519 signature algorithm.",
      commit: "fc9a2b7",
      branch: "main",
      status: "committed",
      goals: ["Implement PKCE", "Enforce Ed25519 signing"],
      decisions: ["DEC-AUTH-01"],
      drift: true,
      driftWarning: "Document 'docs/spec.md' modified on disk (tamper detected)"
    },
    {
      id: "86ae9227-aed7-4f31-9425-ae98986bfd83",
      task_id: "phase-4-handoff",
      timestamp: "Oct 17, 6:46 PM",
      author: "omprakashprajapat (CLI)",
      summary: "Phase 4 committed locally to git (commit a1f3f67); selective export and safe import verified.",
      commit: "a1f3f67",
      branch: "main",
      status: "committed",
      goals: ["Selective export", "Safe import"],
      decisions: ["DEC-HANDOFF-01"],
      drift: false
    },
    {
      id: "036f961d-9c30-49d9-98c6-e0cf9f5e6871",
      task_id: "phase-3-complete",
      timestamp: "Oct 17, 5:51 PM",
      author: "omprakashprajapat (CLI)",
      summary: "Phase 3 MCP integration verified with Antigravity; resolved daemon lifecycle in vf.js.",
      commit: "c6452f0",
      branch: "main",
      status: "committed",
      goals: ["Bidirectional MCP handover"],
      decisions: ["DEC-MCP-02"],
      drift: false
    }
  ],
  modules: [
    {
      id: "auth-service",
      name: "Authentication & PKCE",
      category: "Security",
      owner: "Om (Antigravity)",
      status: "Tamper Flagged",
      drift: true,
      files: 8,
      decisions: ["DEC-AUTH-01: SHA-256 Code Challenge"],
      dependencies: ["mcp-bridge", "context-store"],
      x: 320,
      y: 120,
      description: "Handles RFC 7636 PKCE authorization flow, token validation, and Ed25519 key signing."
    },
    {
      id: "ai-reasoning",
      name: "AI Reasoning Engine",
      category: "AI / Copilot",
      owner: "Meta Llama / Muse",
      status: "Active",
      drift: false,
      files: 6,
      decisions: ["DEC-AI-1: OpenAI-compatible abstraction", "DEC-AI-2: Ephemeral reasoning"],
      dependencies: ["code-index", "context-store", "briefing-engine"],
      x: 600,
      y: 120,
      description: "Generates grounded continuation narratives, architecture warnings, and ranked next steps."
    },
    {
      id: "code-index",
      name: "Semantic Code Index",
      category: "Core",
      owner: "VectorForce",
      status: "Verified",
      drift: false,
      files: 12,
      decisions: ["ADR-013: Containment-safe symbols"],
      dependencies: ["context-store"],
      x: 600,
      y: 320,
      description: "Indexes workspace AST symbols, classes, functions, and import topologies without external dependencies."
    },
    {
      id: "briefing-engine",
      name: "Briefing & Drift Engine",
      category: "Continuity",
      owner: "VectorForce",
      status: "Verified",
      drift: false,
      files: 4,
      decisions: ["ADR-003: Portable Checkpoints", "DEC-MCP-02: DaemonLifecycle"],
      dependencies: ["context-store"],
      x: 320,
      y: 320,
      description: "Compares live workspace state with recorded checkpoints to detect git commit and document content drift."
    },
    {
      id: "context-store",
      name: "SQLite Context Store",
      category: "Storage",
      owner: "Local WAL",
      status: "Verified",
      drift: false,
      files: 2,
      decisions: ["DEC-01: Node:sqlite WAL mode", "ADR-002: Local-first isolation"],
      dependencies: [],
      x: 460,
      y: 480,
      description: "Local-first SQLite database running in WAL mode with parent-linked provenance and zero cloud leaks."
    },
    {
      id: "mcp-bridge",
      name: "Harness MCP Bridge",
      category: "Integration",
      owner: "Antigravity & Command Code",
      status: "Active",
      drift: false,
      files: 4,
      decisions: ["DEC-MCP-02: Stdio JSON-RPC"],
      dependencies: ["context-store", "ai-reasoning"],
      x: 120,
      y: 220,
      description: "Stdio Model Context Protocol server exposing tool capabilities to Google Antigravity and Command Code."
    },
    {
      id: "handoff-service",
      name: "Safe Handoff & Export",
      category: "Security",
      owner: "VectorForce",
      status: "Verified",
      drift: false,
      files: 3,
      decisions: ["DEC-HANDOFF-01: Cryptographic Bundle"],
      dependencies: ["context-store"],
      x: 820,
      y: 220,
      description: "Exports single-file boundary-isolated context packages with cryptographic manifests for teammates."
    }
  ],
  team: [
    {
      name: "Om Prakash Prajapat",
      role: "Lead Engineer & Architect",
      harness: "Command Code / Antigravity",
      avatar: "OP",
      activeTask: "AI Engineering Memory",
      status: "Active"
    },
    {
      name: "Meta Muse AI",
      role: "Autonomous Reasoning Copilot",
      harness: "Llama 3.3 70B",
      avatar: "AI",
      activeTask: "Context Synthesis & Drift Detection",
      status: "Synthesizing"
    },
    {
      name: "External Reviewer",
      role: "Security Auditor",
      harness: "Handoff Bundle Inspector",
      avatar: "ER",
      activeTask: "Zero-Dependency Audit",
      status: "Read Only"
    }
  ]
};
