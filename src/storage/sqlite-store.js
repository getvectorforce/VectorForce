import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ErrorCode, VectorForceError } from '../core/errors.js';
import { validateCheckpoint, validateReceipt, SCHEMA_VERSION_RECEIPT } from '../core/types.js';
import { generateUuid } from '../core/hash.js';

export class SqliteStore {
  /**
   * @param {string} [dbPath=':memory:'] Path to SQLite database file or ':memory:'
   */
  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this._initSchema();
  }

  _initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA synchronous = NORMAL;
      PRAGMA user_version = 1;

      CREATE TABLE IF NOT EXISTS projects (
        project_id TEXT PRIMARY KEY,
        canonical_path TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        task_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'abandoned')),
        parent_task_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (project_id, task_id),
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
        checkpoint_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        parent_id TEXT,
        timestamp TEXT NOT NULL,
        author_json TEXT NOT NULL,
        summary TEXT NOT NULL,
        claims_json TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        FOREIGN KEY (project_id, task_id) REFERENCES tasks(project_id, task_id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES checkpoints(checkpoint_id)
      );

      CREATE INDEX IF NOT EXISTS idx_checkpoints_task ON checkpoints(project_id, task_id, timestamp);

      CREATE TABLE IF NOT EXISTS operations (
        operation_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        status TEXT NOT NULL,
        reference_id TEXT,
        created_at TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        errors_json TEXT NOT NULL,
        UNIQUE(project_id, task_id, request_hash)
      );

      CREATE TABLE IF NOT EXISTS document_policies (
        project_id TEXT PRIMARY KEY,
        allowed_paths_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
      );
    `);

    try {
      const taskCols = this.db.prepare("PRAGMA table_info(tasks)").all();
      if (!taskCols.some(c => c.name === 'parent_task_id')) {
        this.db.exec('ALTER TABLE tasks ADD COLUMN parent_task_id TEXT;');
      }
    } catch {}
  }

  close() {
    this.db.close();
  }

  // --- Project & Task Operations ---

  registerProject(projectId, canonicalPath, name) {
    const existing = this.db.prepare('SELECT * FROM projects WHERE canonical_path = ?').get(canonicalPath);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO projects (project_id, canonical_path, name, created_at) VALUES (?, ?, ?, ?)'
    ).run(projectId, canonicalPath, name, now);
    return { project_id: projectId, canonical_path: canonicalPath, name, created_at: now };
  }

  getProjectByPath(canonicalPath) {
    return this.db.prepare('SELECT * FROM projects WHERE canonical_path = ?').get(canonicalPath) || null;
  }

  getProjectById(projectId) {
    return this.db.prepare('SELECT * FROM projects WHERE project_id = ?').get(projectId) || null;
  }

  createTask(projectId, taskId, title, parentTaskId = null) {
    const project = this.getProjectById(projectId);
    if (!project) {
      throw new VectorForceError(ErrorCode.PROJECT_NOT_INITIALIZED, `Project ${projectId} does not exist`);
    }
    const existing = this.db.prepare(
      'SELECT * FROM tasks WHERE project_id = ? AND task_id = ?'
    ).get(projectId, taskId);
    if (existing) {
      return existing;
    }
    if (parentTaskId) {
      const parent = this.getTask(projectId, parentTaskId);
      if (!parent) {
        throw new VectorForceError(ErrorCode.TASK_NOT_FOUND, `Parent task ${parentTaskId} not found in project ${projectId}`);
      }
    }
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO tasks (task_id, project_id, title, status, parent_task_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(taskId, projectId, title, 'active', parentTaskId || null, now, now);
    return { task_id: taskId, project_id: projectId, title, status: 'active', parent_task_id: parentTaskId || null, created_at: now, updated_at: now };
  }

  getTask(projectId, taskId) {
    return this.db.prepare(
      'SELECT * FROM tasks WHERE project_id = ? AND task_id = ?'
    ).get(projectId, taskId) || null;
  }

  listTasks(projectId, status = null, parentTaskId = undefined) {
    let sql = 'SELECT * FROM tasks WHERE project_id = ?';
    const params = [projectId];
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (parentTaskId !== undefined) {
      if (parentTaskId === null) {
        sql += ' AND parent_task_id IS NULL';
      } else {
        sql += ' AND parent_task_id = ?';
        params.push(parentTaskId);
      }
    }
    sql += ' ORDER BY updated_at DESC';
    return this.db.prepare(sql).all(...params);
  }

  updateTaskStatus(projectId, taskId, status) {
    const validStatuses = ['active', 'completed', 'abandoned'];
    if (!validStatuses.includes(status)) {
      throw new VectorForceError(ErrorCode.TASK_NOT_FOUND, `Invalid task status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    const now = new Date().toISOString();
    const result = this.db.prepare(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE project_id = ? AND task_id = ?'
    ).run(status, now, projectId, taskId);
    if (result.changes === 0) {
      throw new VectorForceError(ErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found in project ${projectId}`);
    }
    return this.getTask(projectId, taskId);
  }

  // --- Policy Operations ---

  setDocumentPolicy(projectId, allowedPaths) {
    const now = new Date().toISOString();
    const sortedUnique = Array.from(new Set(allowedPaths)).sort();
    this.db.prepare(`
      INSERT INTO document_policies (project_id, allowed_paths_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        allowed_paths_json = excluded.allowed_paths_json,
        updated_at = excluded.updated_at
    `).run(projectId, JSON.stringify(sortedUnique), now);
    return sortedUnique;
  }

  getDocumentPolicy(projectId) {
    const row = this.db.prepare('SELECT allowed_paths_json FROM document_policies WHERE project_id = ?').get(projectId);
    return row ? JSON.parse(row.allowed_paths_json) : [];
  }

  // --- Checkpoint Operations ---

  getCheckpoint(checkpointId) {
    const row = this.db.prepare('SELECT * FROM checkpoints WHERE checkpoint_id = ?').get(checkpointId);
    if (!row) return null;
    return {
      schema_version: 'vectorforce/checkpoint/v1',
      checkpoint_id: row.checkpoint_id,
      project_id: row.project_id,
      task_id: row.task_id,
      parent_id: row.parent_id,
      timestamp: row.timestamp,
      author: JSON.parse(row.author_json),
      summary: row.summary,
      claims: JSON.parse(row.claims_json),
      evidence: JSON.parse(row.evidence_json),
      metadata: JSON.parse(row.metadata_json)
    };
  }

  /**
   * Retrieve checkpoints for a project, optionally filtered by task, since timestamp, or limit.
   * @param {string} projectId
   * @param {object} [options]
   * @param {string} [options.taskId]
   * @param {string} [options.since]
   * @param {number} [options.limit]
   * @returns {Array<object>}
   */
  getCheckpoints(projectId, options = {}) {
    let sql = 'SELECT * FROM checkpoints WHERE project_id = ?';
    const params = [projectId];
    if (options.taskId) {
      sql += ' AND task_id = ?';
      params.push(options.taskId);
    }
    if (options.since) {
      sql += ' AND timestamp >= ?';
      params.push(options.since);
    }
    sql += ' ORDER BY timestamp ASC';
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    const rows = this.db.prepare(sql).all(...params);
    return rows.map(row => ({
      schema_version: 'vectorforce/checkpoint/v1',
      checkpoint_id: row.checkpoint_id,
      project_id: row.project_id,
      task_id: row.task_id,
      parent_id: row.parent_id,
      timestamp: row.timestamp,
      author: JSON.parse(row.author_json),
      summary: row.summary,
      claims: JSON.parse(row.claims_json),
      evidence: JSON.parse(row.evidence_json),
      metadata: JSON.parse(row.metadata_json)
    }));
  }

  /**
   * Find leaf checkpoints (checkpoints that are not parents of any other checkpoint in the task).
   * @param {string} projectId
   * @param {string} taskId
   * @returns {Array<object>}
   */
  getLeafCheckpoints(projectId, taskId) {
    const rows = this.db.prepare(`
      SELECT c.* FROM checkpoints c
      WHERE c.project_id = ? AND c.task_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM checkpoints child
          WHERE child.parent_id = c.checkpoint_id
        )
      ORDER BY c.timestamp DESC
    `).all(projectId, taskId);

    return rows.map(row => ({
      schema_version: 'vectorforce/checkpoint/v1',
      checkpoint_id: row.checkpoint_id,
      project_id: row.project_id,
      task_id: row.task_id,
      parent_id: row.parent_id,
      timestamp: row.timestamp,
      author: JSON.parse(row.author_json),
      summary: row.summary,
      claims: JSON.parse(row.claims_json),
      evidence: JSON.parse(row.evidence_json),
      metadata: JSON.parse(row.metadata_json)
    }));
  }

  /**
   * Record a checkpoint atomically with an operation receipt.
   * If a matching request_hash exists for (project_id, task_id), returns idempotent replay receipt.
   */
  saveCheckpointAtomic(checkpoint, requestHash, operationId = generateUuid(), operationType = 'checkpoint') {
    validateCheckpoint(checkpoint);

    // Check for idempotent replay
    const existingOp = this.db.prepare(
      'SELECT * FROM operations WHERE project_id = ? AND task_id = ? AND request_hash = ?'
    ).get(checkpoint.project_id, checkpoint.task_id, requestHash);

    if (existingOp) {
      return {
        schema_version: SCHEMA_VERSION_RECEIPT,
        operation_id: existingOp.operation_id,
        operation_type: existingOp.operation_type,
        status: 'idempotent_replay',
        reference_id: existingOp.reference_id,
        timestamp: existingOp.created_at,
        request_hash: existingOp.request_hash,
        warnings: JSON.parse(existingOp.warnings_json),
        errors: JSON.parse(existingOp.errors_json),
        briefing_path: null
      };
    }

    // Validate parent checkpoint
    if (checkpoint.parent_id !== null) {
      const parent = this.db.prepare('SELECT * FROM checkpoints WHERE checkpoint_id = ?').get(checkpoint.parent_id);
      if (!parent) {
        throw new VectorForceError(
          ErrorCode.PARENT_CHECKPOINT_NOT_FOUND,
          `Parent checkpoint ${checkpoint.parent_id} does not exist`
        );
      }
      if (parent.project_id !== checkpoint.project_id || parent.task_id !== checkpoint.task_id) {
        throw new VectorForceError(
          ErrorCode.CROSS_TASK_PARENT_FORBIDDEN,
          `Parent checkpoint belongs to task ${parent.task_id}, not ${checkpoint.task_id}`
        );
      }
    }

    // Atomic transaction
    const now = new Date().toISOString();
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      this.db.prepare(`
        INSERT INTO checkpoints (
          checkpoint_id, project_id, task_id, parent_id, timestamp,
          author_json, summary, claims_json, evidence_json, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkpoint.checkpoint_id,
        checkpoint.project_id,
        checkpoint.task_id,
        checkpoint.parent_id,
        checkpoint.timestamp,
        JSON.stringify(checkpoint.author),
        checkpoint.summary,
        JSON.stringify(checkpoint.claims),
        JSON.stringify(checkpoint.evidence),
        JSON.stringify(checkpoint.metadata || {})
      );

      // Update task updated_at
      this.db.prepare(`
        UPDATE tasks SET updated_at = ? WHERE project_id = ? AND task_id = ?
      `).run(now, checkpoint.project_id, checkpoint.task_id);

      // Record operation
      this.db.prepare(`
        INSERT INTO operations (
          operation_id, project_id, task_id, request_hash, operation_type,
          status, reference_id, created_at, warnings_json, errors_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        operationId,
        checkpoint.project_id,
        checkpoint.task_id,
        requestHash,
        operationType,
        'committed',
        checkpoint.checkpoint_id,
        now,
        JSON.stringify([]),
        JSON.stringify([])
      );

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    const receipt = {
      schema_version: SCHEMA_VERSION_RECEIPT,
      operation_id: operationId,
      operation_type: operationType,
      status: 'committed',
      reference_id: checkpoint.checkpoint_id,
      timestamp: now,
      request_hash: requestHash,
      warnings: [],
      errors: [],
      briefing_path: null
    };

    validateReceipt(receipt);
    return receipt;
  }
}
