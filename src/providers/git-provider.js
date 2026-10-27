import { execFileSync } from 'node:child_process';

export class GitProvider {
  /**
   * Collect read-only Git status and HEAD commit.
   * Never mutates source or calls network commands.
   * @param {string} workspacePath
   * @returns {{ git: object|null, gap: object|null }}
   */
  static collect(workspacePath) {
    try {
      // 1. Commit hash
      const commitHash = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: workspacePath,
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();

      // 2. Branch name
      let branch = 'HEAD';
      try {
        branch = execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], {
          cwd: workspacePath,
          encoding: 'utf8',
          timeout: 2000,
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
      } catch {
        // Detached HEAD or initial commit
      }

      // 3. Status porcelain (check if dirty)
      const statusOutput = execFileSync('git', ['status', '--porcelain'], {
        cwd: workspacePath,
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();

      const isDirty = statusOutput.length > 0;
      const collectedAt = new Date().toISOString();

      return {
        git: {
          commit_hash: commitHash,
          branch,
          is_dirty: isDirty,
          collected_at: collectedAt
        },
        gap: null
      };
    } catch (err) {
      return {
        git: null,
        gap: {
          type: 'git',
          target: 'workspace',
          reason: `Git metadata unavailable: ${err.message || 'Not a git repository or git command failed'}`
        }
      };
    }
  }

  /**
   * List workspace-relative files changed since a given commit (read-only).
   * Deleted files are excluded so callers only reason over files that still exist.
   * @param {string} workspacePath
   * @param {string} [sinceCommit] 40-hex commit hash; when omitted, uses working-tree changes only
   * @returns {{ files: string[], gap: object|null }}
   */
  static collectChangedFiles(workspacePath, sinceCommit = null) {
    try {
      const args = ['diff', '--name-only', '--diff-filter=d'];
      if (sinceCommit) args.push(sinceCommit);
      args.push('--');

      const output = execFileSync('git', args, {
        cwd: workspacePath,
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();

      const files = output.length > 0 ? output.split('\n').map(f => f.trim()).filter(Boolean) : [];
      return { files, gap: null };
    } catch (err) {
      return {
        files: [],
        gap: {
          type: 'git',
          target: 'changed-files',
          reason: `Git changed-file listing unavailable: ${err.message || 'Not a git repository or git command failed'}`
        }
      };
    }
  }
}
