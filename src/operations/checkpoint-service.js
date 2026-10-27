import { GitProvider } from '../providers/git-provider.js';
import { DocumentProvider } from '../providers/document-provider.js';
import { generateUuid, hashRequestPayload } from '../core/hash.js';
import { SCHEMA_VERSION_CHECKPOINT } from '../core/types.js';

export class CheckpointService {
  /**
   * @param {import('../storage/sqlite-store.js').SqliteStore} store
   * @param {import('./project-service.js').ProjectService} projectService
   */
  constructor(store, projectService) {
    this.store = store;
    this.projectService = projectService;
  }

  /**
   * Capture an immutable checkpoint.
   * @param {object} params
   * @param {string} params.workspacePath Canonical or relative workspace path
   * @param {string} [params.taskId] Optional explicit task ID
   * @param {string} params.summary Concise progress summary
   * @param {string[]} params.goals Active goals
   * @param {string[]} params.constraints Key constraints
   * @param {Array<{id: string, title: string, rationale: string}>} [params.decisions=[]]
   * @param {string[]} [params.nextSteps=[]]
   * @param {string[]} [params.openQuestions=[]]
   * @param {boolean} [params.includeGit=true]
   * @param {string[]} [params.requestedDocuments=[]]
   * @param {string} [params.parentId=null]
   * @param {string} [params.authorName='developer']
   * @param {string} [params.authorHarness='antigravity']
   * @param {string} [params.operationId]
   * @returns {import('../core/types.js').OperationReceiptV1}
   */
  captureCheckpoint(params) {
    const { task, project } = this.projectService.resolveTask(params.workspacePath, params.taskId);

    // Compute request hash for idempotency deduplication
    const requestPayload = {
      projectId: project.project_id,
      taskId: task.task_id,
      summary: params.summary,
      goals: params.goals || [],
      constraints: params.constraints || [],
      decisions: params.decisions || [],
      nextSteps: params.nextSteps || [],
      openQuestions: params.openQuestions || [],
      includeGit: params.includeGit !== false,
      requestedDocuments: (params.requestedDocuments || []).slice().sort(),
      parentId: params.parentId || null
    };
    const requestHash = hashRequestPayload(requestPayload);

    // If parentId not specified, discover latest single leaf
    let parentId = params.parentId || null;
    if (!parentId) {
      const leaves = this.store.getLeafCheckpoints(project.project_id, task.task_id);
      if (leaves.length === 1) {
        parentId = leaves[0].checkpoint_id;
      }
      // If leaves.length > 1, parentId stays null or explicit selection is required
    }

    // 1. Collect Git evidence if requested
    let gitEvidence = null;
    const gaps = [];
    if (params.includeGit !== false) {
      const gitResult = GitProvider.collect(project.canonical_path);
      gitEvidence = gitResult.git;
      if (gitResult.gap) gaps.push(gitResult.gap);
    }

    // 2. Collect Document evidence if requested
    let documentEvidence = [];
    if (params.requestedDocuments && params.requestedDocuments.length > 0) {
      const policy = this.store.getDocumentPolicy(project.project_id);
      const docResult = DocumentProvider.collect(
        project.canonical_path,
        params.requestedDocuments,
        policy
      );
      documentEvidence = docResult.documents;
      if (docResult.gaps) gaps.push(...docResult.gaps);
    }

    // 3. Assemble checkpoint record
    const checkpointId = generateUuid();
    const now = new Date().toISOString();

    const checkpoint = {
      schema_version: SCHEMA_VERSION_CHECKPOINT,
      checkpoint_id: checkpointId,
      project_id: project.project_id,
      task_id: task.task_id,
      parent_id: parentId,
      timestamp: now,
      author: {
        name: params.authorName || 'developer',
        harness: params.authorHarness || 'antigravity'
      },
      summary: params.summary,
      claims: {
        goals: params.goals || [],
        constraints: params.constraints || [],
        decisions: params.decisions || [],
        next_steps: params.nextSteps || [],
        open_questions: params.openQuestions || []
      },
      evidence: {
        git: gitEvidence,
        documents: documentEvidence,
        gaps
      },
      metadata: params.metadata || {}
    };

    // 4. Save atomically in store
    return this.store.saveCheckpointAtomic(checkpoint, requestHash, params.operationId);
  }
}
