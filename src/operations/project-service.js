import { Authorizer } from '../policy/authorizer.js';
import { sha256 } from '../core/hash.js';
import { basename, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ErrorCode, VectorForceError } from '../core/errors.js';

export class ProjectService {
  /**
   * @param {import('../storage/sqlite-store.js').SqliteStore} store
   */
  constructor(store) {
    this.store = store;
  }

  /**
   * Initialize or retrieve a project for a workspace directory.
   * Derives a deterministic project identity from Git remote URL if present,
   * ensuring that multiple developers cloning the same repo share the identical project ID.
   * @param {string} workspacePath
   * @param {string} [customName]
   * @returns {{ project_id: string, canonical_path: string, name: string, created_at: string }}
   */
  initProject(workspacePath, customName = null) {
    const canonical = Authorizer.canonicalizeWorkspace(workspacePath);
    const existing = this.store.getProjectByPath(canonical);
    if (existing) {
      return existing;
    }

    let identitySeed = canonical;
    try {
      const gitRemote = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
        cwd: canonical,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 1000
      }).trim();
      if (gitRemote) {
        identitySeed = gitRemote.toLowerCase();
      }
    } catch {}

    const idHash = sha256(identitySeed).slice(0, 16);
    const projectId = `proj-${idHash}`;
    const name = customName || basename(canonical);
    return this.store.registerProject(projectId, canonical, name);
  }

  /**
   * Get project for a workspace path, walking up to root if in a subdirectory.
   * @param {string} workspacePath
   */
  getProjectForWorkspace(workspacePath) {
    if (workspacePath) {
      let canonical = Authorizer.canonicalizeWorkspace(workspacePath);
      while (true) {
        const project = this.store.getProjectByPath(canonical);
        if (project) {
          return project;
        }
        const parent = dirname(canonical);
        if (parent === canonical) break;
        canonical = parent;
      }
    }

    // Resilience fallback: if workspacePath is root or doesn't match, check if there's an initialized project in the database
    const allProjects = this.store.db.prepare('SELECT * FROM projects').all();
    if (allProjects.length === 1) {
      return allProjects[0];
    }

    throw new VectorForceError(
      ErrorCode.PROJECT_NOT_INITIALIZED,
      `Workspace ${workspacePath} has not been initialized. Run 'vf init' first.`
    );
  }

  /**
   * Create a new task within a project.
   * @param {string} workspacePath
   * @param {string} taskId Kebab-case slug
   * @param {string} title
   * @param {string|null} [parentTaskId]
   */
  createTask(workspacePath, taskId, title, parentTaskId = null) {
    const project = this.getProjectForWorkspace(workspacePath);
    return this.store.createTask(project.project_id, taskId, title, parentTaskId);
  }

  /**
   * List tasks for a workspace.
   * @param {string} workspacePath
   * @param {'active' | 'archived' | 'all'} [status]
   * @param {string|null} [parentTaskId]
   */
  listTasks(workspacePath, status = 'all', parentTaskId = undefined) {
    const project = this.getProjectForWorkspace(workspacePath);
    return this.store.listTasks(project.project_id, status, parentTaskId);
  }

  /**
   * Update the status of a task.
   * @param {string} workspacePath
   * @param {string} taskId
   * @param {'active' | 'completed' | 'abandoned'} status
   */
  updateTaskStatus(workspacePath, taskId, status) {
    const project = this.getProjectForWorkspace(workspacePath);
    return this.store.updateTaskStatus(project.project_id, taskId, status);
  }

  /**
   * Resolve a task for an operation, enforcing non-ambiguous selection.
   * @param {string} workspacePath
   * @param {string} [explicitTaskId]
   * @returns {{ task: object, project: object }}
   */
  resolveTask(workspacePath, explicitTaskId = null) {
    const project = this.getProjectForWorkspace(workspacePath);

    if (explicitTaskId) {
      const task = this.store.getTask(project.project_id, explicitTaskId);
      if (!task) {
        throw new VectorForceError(
          ErrorCode.TASK_NOT_FOUND,
          `Task '${explicitTaskId}' does not exist in project ${project.project_id}`
        );
      }
      return { task, project };
    }

    // No explicit task ID provided: inspect active tasks
    const activeTasks = this.store.listTasks(project.project_id, 'active');
    if (activeTasks.length === 0) {
      throw new VectorForceError(
        ErrorCode.TASK_NOT_FOUND,
        `No active tasks found in project. Create one using 'vf task <id> "<title>"'`
      );
    }
    if (activeTasks.length > 1) {
      const taskIds = activeTasks.map(t => t.task_id).join(', ');
      throw new VectorForceError(
        ErrorCode.AMBIGUOUS_TASK_SELECTION,
        `Multiple active tasks found (${taskIds}). You must explicitly specify --task <id>.`
      );
    }

    return { task: activeTasks[0], project };
  }
}
