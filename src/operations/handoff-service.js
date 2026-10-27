import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { sha256 } from '../core/hash.js';
import { ErrorCode, VectorForceError } from '../core/errors.js';
import { Authorizer } from '../policy/authorizer.js';
import {
  SCHEMA_VERSION_HANDOFF,
  SCHEMA_VERSION_MANIFEST,
  SCHEMA_VERSION_RECEIPT,
  validateHandoff,
  validateManifest
} from '../core/types.js';

export class HandoffService {
  /**
   * @param {import('../storage/sqlite-store.js').SqliteStore} store
   * @param {import('./project-service.js').ProjectService} projectService
   * @param {import('./checkpoint-service.js').CheckpointService} [checkpointService]
   */
  constructor(store, projectService, checkpointService = null) {
    this.store = store;
    this.projectService = projectService;
    this.checkpointService = checkpointService;
  }

  /**
   * Export a selective, boundary-safe handoff package.
   * @param {object} params
   * @param {string} params.workspacePath
   * @param {string} params.taskId
   * @param {string} [params.checkpointId]
   * @param {string} params.recipient Target recipient (developer name or team)
   * @param {string} [params.destinationHarness='any'] Destination harness
   * @param {boolean} [params.preview=false] If true, returns preview without writing
   * @param {string} [params.outPath] Optional custom destination path
   * @returns {{ preview?: boolean, receipt?: object, package_id: string, handoff: object, manifest: object, bundlePath?: string }}
   */
  exportHandoff(params) {
    if (!params.recipient || typeof params.recipient !== 'string' || !params.recipient.trim()) {
      throw new VectorForceError(ErrorCode.HANDOFF_RECIPIENT_REQUIRED, 'Target recipient is required for handoff export');
    }

    const destination = params.destinationHarness || 'any';
    if (destination !== 'any') {
      Authorizer.authorizeDestination(destination);
    }

    const { task, project } = this.projectService.resolveTask(params.workspacePath, params.taskId);

    // Resolve checkpoint to export
    let checkpoint;
    if (params.checkpointId) {
      checkpoint = this.store.getCheckpoint(params.checkpointId);
      if (!checkpoint || checkpoint.project_id !== project.project_id || checkpoint.task_id !== task.task_id) {
        throw new VectorForceError(
          ErrorCode.SCHEMA_VALIDATION_FAILED,
          `Checkpoint '${params.checkpointId}' not found for task '${task.task_id}'`
        );
      }
    } else {
      const leaves = this.store.getLeafCheckpoints(project.project_id, task.task_id);
      if (leaves.length === 0) {
        throw new VectorForceError(
          ErrorCode.TASK_NOT_FOUND,
          `Task '${task.task_id}' has no checkpoints recorded yet.`
        );
      }
      if (leaves.length > 1) {
        throw new VectorForceError(
          ErrorCode.DIVERGENT_HEADS,
          `Task has divergent heads. Explicit checkpoint ID required.`
        );
      }
      checkpoint = leaves[0];
    }

    // Boundary Isolation: Strip internal IDs, private ancestor history, and unallowlisted data
    const canonicalClaims = {
      goals: [...checkpoint.claims.goals],
      constraints: [...checkpoint.claims.constraints],
      decisions: checkpoint.claims.decisions.map(d => ({ ...d })),
      next_steps: [...checkpoint.claims.next_steps],
      open_questions: checkpoint.claims.open_questions ? [...checkpoint.claims.open_questions] : []
    };

    const canonicalEvidence = {
      git: checkpoint.evidence.git ? { ...checkpoint.evidence.git } : null,
      documents: checkpoint.evidence.documents ? checkpoint.evidence.documents.map(d => ({ ...d })) : [],
      gaps: checkpoint.evidence.gaps ? checkpoint.evidence.gaps.map(g => ({ ...g })) : []
    };

    const packageSeed = `${project.project_id}:${task.task_id}:${checkpoint.checkpoint_id}:${params.recipient.trim()}:${destination}`;
    const packageId = `hand-${sha256(packageSeed).slice(0, 16)}`;

    const handoff = {
      schema_version: SCHEMA_VERSION_HANDOFF,
      package_id: packageId,
      created_at: new Date().toISOString(),
      origin: {
        project_name: project.name,
        task_id: task.task_id,
        task_title: task.title,
        checkpoint_id: checkpoint.checkpoint_id
      },
      disclosure: {
        recipient: params.recipient.trim(),
        destination_harness: destination
      },
      checkpoint: {
        summary: checkpoint.summary,
        claims: canonicalClaims,
        evidence: canonicalEvidence
      }
    };

    validateHandoff(handoff);

    const handoffJsonStr = JSON.stringify(handoff, null, 2);
    const handoffHash = sha256(handoffJsonStr);
    const handoffBytes = Buffer.byteLength(handoffJsonStr, 'utf8');

    const manifest = {
      schema_version: SCHEMA_VERSION_MANIFEST,
      package_id: packageId,
      created_at: handoff.created_at,
      files: [
        {
          path: 'handoff.json',
          sha256: handoffHash,
          size_bytes: handoffBytes
        }
      ]
    };

    validateManifest(manifest);

    if (params.preview) {
      return {
        preview: true,
        package_id: packageId,
        handoff,
        manifest
      };
    }

    // Write bundle
    let targetPath;
    if (params.outPath) {
      targetPath = resolve(params.outPath);
      // Path traversal check
      if (params.outPath.includes('..')) {
        throw new VectorForceError(ErrorCode.PATH_TRAVERSAL_DETECTED, `Path traversal in outPath: ${params.outPath}`);
      }
    } else {
      const handoffsDir = join(homedir(), '.vectorforce', 'handoffs');
      mkdirSync(handoffsDir, { recursive: true, mode: 0o700 });
      targetPath = join(handoffsDir, `${packageId}.json`);
    }

    const bundle = {
      schema_version: 'vectorforce/handoff-bundle/v1',
      package_id: packageId,
      created_at: handoff.created_at,
      manifest,
      handoff
    };

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, JSON.stringify(bundle, null, 2), 'utf8');

    const receipt = {
      schema_version: SCHEMA_VERSION_RECEIPT,
      operation_id: randomUUID(),
      operation_type: 'export',
      status: 'committed',
      reference_id: packageId,
      timestamp: new Date().toISOString(),
      request_hash: sha256(JSON.stringify({ packageId, targetPath, recipient: params.recipient })),
      warnings: [],
      errors: [],
      briefing_path: targetPath
    };

    return {
      package_id: packageId,
      bundlePath: targetPath,
      receipt,
      handoff,
      manifest
    };
  }

  /**
   * Safe import of a handoff package into a workspace with explicit context reconciliation.
   * @param {object} params
   * @param {string} params.workspacePath Current workspace path
   * @param {string} params.bundlePath Path to handoff package JSON or bundle
   * @param {string} [params.targetTaskId] Optional target task ID
   * @returns {{ receipt: object, importedCheckpointId: string, task: object }}
   */
  importHandoff(params) {
    if (!params.bundlePath || typeof params.bundlePath !== 'string') {
      throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'bundlePath is required');
    }

    const rawPath = resolve(params.bundlePath);
    if (!existsSync(rawPath)) {
      throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, `Handoff bundle file not found: ${rawPath}`);
    }

    const stat = statSync(rawPath);
    if (stat.size > 2 * 1024 * 1024) { // 2 MB safety cap
      throw new VectorForceError(ErrorCode.DOCUMENT_TOO_LARGE, `Handoff bundle exceeds size limit (max 2MB)`);
    }

    let rawContent;
    try {
      rawContent = readFileSync(rawPath, 'utf8');
    } catch (e) {
      throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, `Failed to read bundle: ${e.message}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'Invalid JSON in handoff bundle');
    }

    let handoff;
    let manifest;

    if (parsed.schema_version === 'vectorforce/handoff-bundle/v1') {
      handoff = parsed.handoff;
      manifest = parsed.manifest;
    } else if (parsed.schema_version === SCHEMA_VERSION_HANDOFF) {
      handoff = parsed;
    } else {
      throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'Unrecognized bundle schema version');
    }

    // Schema validation
    validateHandoff(handoff);

    if (manifest) {
      validateManifest(manifest);
      // Validate integrity against manifest
      const handoffFileEntry = manifest.files.find(f => f.path === 'handoff.json');
      if (handoffFileEntry) {
        const actualHandoffHash = sha256(JSON.stringify(handoff, null, 2));
        if (handoffFileEntry.sha256 !== actualHandoffHash) {
          throw new VectorForceError(
            ErrorCode.HANDOFF_INTEGRITY_FAILED,
            `Handoff integrity verification failed: hash mismatch against manifest`
          );
        }
      }
    }

    // Resolve or initialize destination project
    const project = this.projectService.getProjectForWorkspace(params.workspacePath);

    // Determine target task
    const targetTaskId = params.targetTaskId || handoff.origin.task_id;
    let task = this.store.getTask(project.project_id, targetTaskId);
    if (!task) {
      task = this.store.createTask(
        project.project_id,
        targetTaskId,
        `${handoff.origin.task_title || targetTaskId} [Imported]`
      );
    }

    // Context Reconciliation (ADR-006):
    // Check for existing checkpoints for this task
    const existingHeads = this.store.getLeafCheckpoints(project.project_id, task.task_id);
    let parentId = null;
    let summaryPrefix = `[Handoff from ${handoff.origin.project_name}]`;

    if (existingHeads.length > 0) {
      parentId = existingHeads[0].checkpoint_id;
      summaryPrefix = `[Reconciled Handoff from ${handoff.origin.project_name}]`;
    }

    // Attribution prefix on imported decisions
    const attributedDecisions = handoff.checkpoint.claims.decisions.map(d => ({
      id: d.id,
      title: d.title,
      rationale: `${d.rationale} (Imported from ${handoff.origin.project_name}:${handoff.origin.checkpoint_id.slice(0, 8)})`
    }));

    const checkpointRecord = {
      schema_version: 'vectorforce/checkpoint/v1',
      checkpoint_id: randomUUID(),
      project_id: project.project_id,
      task_id: task.task_id,
      parent_id: parentId,
      timestamp: new Date().toISOString(),
      author: {
        name: process.env.USER || 'developer',
        harness: 'import'
      },
      summary: `${summaryPrefix} ${handoff.checkpoint.summary}`,
      claims: {
        goals: [...handoff.checkpoint.claims.goals],
        constraints: [...handoff.checkpoint.claims.constraints],
        decisions: attributedDecisions,
        next_steps: [...handoff.checkpoint.claims.next_steps],
        open_questions: handoff.checkpoint.claims.open_questions || []
      },
      evidence: {
        git: handoff.checkpoint.evidence.git || null,
        documents: handoff.checkpoint.evidence.documents || [],
        gaps: [
          ...(handoff.checkpoint.evidence.gaps || []),
          {
            type: 'import',
            target: handoff.package_id,
            reason: `Imported from ${handoff.origin.project_name}`
          }
        ]
      },
      metadata: {
        imported_from_package: handoff.package_id,
        imported_origin_project: handoff.origin.project_name,
        imported_origin_task: handoff.origin.task_id
      }
    };

    const operationId = randomUUID();
    const requestHash = sha256(JSON.stringify({ rawPath, targetTaskId, parentId }));

    const receipt = this.store.saveCheckpointAtomic(checkpointRecord, requestHash, operationId, 'import');

    return {
      receipt,
      importedCheckpointId: receipt.reference_id,
      task
    };
  }
}
