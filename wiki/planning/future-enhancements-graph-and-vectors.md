# Future Enhancements: Knowledge Graph & Semantic Vector Search

- **Date:** 2026-10-18
- **Status:** Pending Future Discussion
- **Scope:** Architectural options for formalizing the ontology graph (NetworkX) and dense semantic code search (ChromaDB / SQLite Vectors).

---

## 1. Explicit Knowledge Graph & Topology Analytics (NetworkX)

### Current Implementation (Completed)
- `CodeIndexProvider` dynamically parses AST symbols (classes, functions, exports) and import trees (`edges`).
- VectorForce Studio dynamically clusters these into 12 architectural modules and computes blast radius in real time using native JavaScript traversal.
- Checkpoints, ADR decisions, tasks, and Git evidence are linked through SQLite relational tables.

### Pending Architecture Proposals (For Later Discussion)
1. **Explicit SQLite Graph Tables (`graph_nodes`, `graph_edges`)**:
   - Persist explicit ontology triples `(subject, predicate, object)` in SQLite.
   - Enables recursive SQL graph traversals (`WITH RECURSIVE`) across checkpoints, tasks, and code symbols.
2. **NetworkX Interoperability**:
   - Provide a lightweight CLI command `vf graph export --format gexf` or `--format graphml`.
   - Allows loading VectorForce architecture topologies directly into Python NetworkX, Gephi, or Cytoscape for advanced graph centrality, community detection, and topological visualization without requiring Python at runtime for normal users.

---

## 2. Dense Semantic Search (ChromaDB vs. Local SQLite Vectors)

### Current Implementation (Completed)
- Lexical AST tokenization with stopword filtering and changed-file priority ranking.
- Grounds Meta Llama / Muse reasoning queries with relevant symbol snippets and modified files.

### Pending Architecture Proposals (For Later Discussion)
1. **Option A: ChromaDB Integration**:
   - Provide an optional Chroma client integration (`VF_VECTOR_STORE=chroma`) for teams running a local ChromaDB server or Docker container.
   - Indexes code snippets and ADR decisions into a dedicated Chroma collection for vector similarity querying.
2. **Option B: Zero-Dependency SQLite Embeddings (Recommended Local-First Alternative)**:
   - Generate embeddings using Ollama's local `/api/embeddings` or OpenAI/Muse embeddings API.
   - Store 384d / 768d vectors directly inside a `code_embeddings` table in `.vectorforce/vectorforce.db`.
   - Compute cosine similarity in JavaScript or via a SQLite vector extension, preserving the zero-dependency, single-file SQLite invariant.

---

## Next Steps
- Revisit and discuss these two options after the hackathon demo.
- Prioritize based on user workflow requirements and runtime dependency constraints.
