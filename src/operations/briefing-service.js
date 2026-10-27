import { Authorizer } from '../policy/authorizer.js';
import { GitProvider } from '../providers/git-provider.js';
import { sha256 } from '../core/hash.js';
import { readFileSync } from 'node:fs';
import { ErrorCode, VectorForceError } from '../core/errors.js';

export class BriefingService {
  /**
   * @param {import('../storage/sqlite-store.js').SqliteStore} store
   * @param {import('./project-service.js').ProjectService} projectService
   */
  constructor(store, projectService) {
    this.store = store;
    this.projectService = projectService;
  }

  /**
   * Generate an authorized resume briefing for a task.
   * @param {object} params
   * @param {string} params.workspacePath
   * @param {string} [params.taskId]
   * @param {string} [params.checkpointId]
   * @param {string} [params.destination='cli']
   * @param {number} [params.maxTokens=4000]
   * @returns {{ briefingText: string, driftDetected: boolean, warnings: string[], checkpoint: object }}
   */
  generateBriefing(params) {
    Authorizer.authorizeDestination(params.destination);

    const { task, project } = this.projectService.resolveTask(params.workspacePath, params.taskId);

    // Find target checkpoint
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
        const heads = leaves.map(l => `${l.checkpoint_id} (${l.timestamp})`).join(', ');
        throw new VectorForceError(
          ErrorCode.DIVERGENT_HEADS,
          `Task has divergent checkpoint heads: ${heads}. You must specify --checkpoint <id>.`
        );
      }
      checkpoint = leaves[0];
    }

    // Drift Detection
    const warnings = [];
    let driftDetected = false;

    // 1. Git drift
    const currentGit = GitProvider.collect(project.canonical_path).git;
    const recordedGit = checkpoint.evidence.git;

    let gitDriftSummary = 'Git evidence not recorded.';
    if (recordedGit && currentGit) {
      if (recordedGit.commit_hash !== currentGit.commit_hash) {
        driftDetected = true;
        warnings.push(`Git commit has drifted from ${recordedGit.commit_hash.slice(0, 7)} to ${currentGit.commit_hash.slice(0, 7)}`);
        gitDriftSummary = `DRIFT: Commit changed from ${recordedGit.commit_hash} to ${currentGit.commit_hash} on branch ${currentGit.branch}.`;
      } else if (recordedGit.is_dirty !== currentGit.is_dirty) {
        driftDetected = true;
        warnings.push(`Working directory dirty state changed (now ${currentGit.is_dirty ? 'dirty' : 'clean'})`);
        gitDriftSummary = `DRIFT: Working directory dirty state changed.`;
      } else {
        gitDriftSummary = `MATCH: Workspace at commit ${currentGit.commit_hash.slice(0, 7)} (${currentGit.branch}), dirty: ${currentGit.is_dirty}.`;
      }
    }

    // 2. Document drift
    const docDriftSummaries = [];
    if (checkpoint.evidence.documents && checkpoint.evidence.documents.length > 0) {
      for (const doc of checkpoint.evidence.documents) {
        try {
          const fullPath = Authorizer.validateDocumentPath(project.canonical_path, doc.path);
          const currentBytes = readFileSync(fullPath);
          const currentHash = sha256(currentBytes);
          if (currentHash !== doc.sha256) {
            driftDetected = true;
            warnings.push(`Document '${doc.path}' content has changed since checkpoint.`);
            docDriftSummaries.push(`- **${doc.path}**: MODIFIED (hash mismatch)`);
          } else {
            docDriftSummaries.push(`- **${doc.path}**: VERIFIED (content unchanged)`);
          }
        } catch (err) {
          driftDetected = true;
          warnings.push(`Document '${doc.path}' is missing or unreadable: ${err.message}`);
          docDriftSummaries.push(`- **${doc.path}**: MISSING / GONE`);
        }
      }
    }

    // Construct Briefing Markdown
    const lines = [];
    lines.push(`# Task Briefing: ${task.title} (\`${task.task_id}\`)`);
    lines.push(`\n**Checkpoint ID:** \`${checkpoint.checkpoint_id}\` | **Recorded:** ${checkpoint.timestamp}`);
    lines.push(`**Author:** ${checkpoint.author.name} via ${checkpoint.author.harness}`);
    lines.push(`\n> [!NOTE]\n> **Summary:** ${checkpoint.summary}`);

    lines.push('\n## Invariant Constraints (Non-Negotiable)');
    if (checkpoint.claims.constraints.length > 0) {
      for (const c of checkpoint.claims.constraints) {
        lines.push(`- ⚠️ ${c}`);
      }
    } else {
      lines.push('*No specific constraints recorded.*');
    }

    lines.push('\n## Active Goals');
    for (const g of checkpoint.claims.goals) {
      lines.push(`- [ ] ${g}`);
    }

    if (checkpoint.claims.decisions.length > 0) {
      lines.push('\n## Architectural Decisions');
      for (const d of checkpoint.claims.decisions) {
        lines.push(`- **${d.id}: ${d.title}** — ${d.rationale}`);
      }
    }

    if (checkpoint.claims.next_steps.length > 0) {
      lines.push('\n## Immediate Next Steps');
      for (const s of checkpoint.claims.next_steps) {
        lines.push(`1. ${s}`);
      }
    }

    if (checkpoint.claims.open_questions.length > 0) {
      lines.push('\n## Open Questions');
      for (const q of checkpoint.claims.open_questions) {
        lines.push(`- ❓ ${q}`);
      }
    }

    lines.push('\n## Verified Workspace Evidence & Drift Analysis');
    lines.push(`- **Git Status:** ${gitDriftSummary}`);
    if (docDriftSummaries.length > 0) {
      lines.push('- **Document States:**');
      for (const ds of docDriftSummaries) {
        lines.push(`  ${ds}`);
      }
    }

    if (checkpoint.evidence.gaps.length > 0) {
      lines.push('\n### Known Evidence Gaps');
      for (const gap of checkpoint.evidence.gaps) {
        lines.push(`- ⚠️ [${gap.type.toUpperCase()}] ${gap.target}: ${gap.reason}`);
      }
    }

    if (checkpoint.evidence.documents && checkpoint.evidence.documents.length > 0) {
      lines.push('\n## Allowlisted Documents (Untrusted Reference Data)');
      for (const doc of checkpoint.evidence.documents) {
        lines.push(`\n### Document: \`${doc.path}\` (${doc.size_bytes} bytes)`);
        lines.push('```markdown');
        lines.push(doc.content || '/* Content snippet omitted */');
        lines.push('```');
      }
    }

    const briefingText = lines.join('\n');
    return {
      briefingText,
      driftDetected,
      warnings,
      checkpoint
    };
  }

  /**
   * Generate an authorized weekly / chronological recap of project checkpoints and engineering progress.
   * @param {object} params
   * @param {string} params.workspacePath
   * @param {number} [params.days=7] Timeframe in days
   * @param {string} [params.taskId] Optional task filter
   * @param {string} [params.destination='cli'] Destination harness
   * @returns {{ recapText: string, checkpoints: Array<object>, taskCount: number }}
   */
  generateRecap(params) {
    Authorizer.authorizeDestination(params.destination || 'cli');

    const project = this.projectService.initProject(params.workspacePath);
    const days = typeof params.days === 'number' ? params.days : 7;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const checkpoints = this.store.getCheckpoints(project.project_id, {
      taskId: params.taskId,
      since: sinceDate
    });

    const tasks = this.projectService.listTasks(params.workspacePath, 'all');
    const taskMap = new Map(tasks.map(t => [t.task_id, t]));

    const lines = [];
    lines.push(`# Weekly Context Continuity Recap: ${project.name}`);
    lines.push(`\n**Time Window:** Past ${days} day(s) (since \`${sinceDate.slice(0, 10)}\`) | **Checkpoints:** ${checkpoints.length}`);
    lines.push(`**Destination Harness:** \`${params.destination || 'cli'}\``);

    if (checkpoints.length === 0) {
      lines.push('\n> [!NOTE]\n> No checkpoints recorded within this timeframe.');
      return { recapText: lines.join('\n'), checkpoints: [], taskCount: 0 };
    }

    const touchedTaskIds = Array.from(new Set(checkpoints.map(c => c.task_id)));
    lines.push(`\n## Active Tasks Covered (${touchedTaskIds.length})`);
    for (const tid of touchedTaskIds) {
      const taskObj = taskMap.get(tid);
      const title = taskObj ? taskObj.title : tid;
      lines.push(`- **${title}** (\`${tid}\`)`);
    }

    lines.push('\n## Chronological Checkpoint Log');
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      const taskObj = taskMap.get(cp.task_id);
      const taskTitle = taskObj ? taskObj.title : cp.task_id;
      lines.push(`\n### ${i + 1}. [${cp.timestamp.replace('T', ' ').slice(0, 19)}] Task: ${taskTitle} (\`${cp.task_id}\`)`);
      lines.push(`- **Checkpoint ID:** \`${cp.checkpoint_id.slice(0, 8)}\` | **Author:** ${cp.author.name} (${cp.author.harness})`);
      lines.push(`- **Summary:** ${cp.summary}`);
      if (cp.claims.goals && cp.claims.goals.length > 0) {
        lines.push(`- **Goals:** ${cp.claims.goals.join('; ')}`);
      }
      if (cp.claims.decisions && cp.claims.decisions.length > 0) {
        lines.push(`- **Decisions:** ${cp.claims.decisions.map(d => `${d.id}: ${d.title}`).join(', ')}`);
      }
      if (cp.claims.constraints && cp.claims.constraints.length > 0) {
        lines.push(`- **Constraints:** ${cp.claims.constraints.join('; ')}`);
      }
      if (cp.evidence.git && cp.evidence.git.commit_hash) {
        lines.push(`- **Git Commit:** \`${cp.evidence.git.commit_hash.slice(0, 7)}\` (${cp.evidence.git.branch}${cp.evidence.git.is_dirty ? ' [dirty]' : ''})`);
      }
    }

    // Aggregate Decisions and Constraints
    const allDecisions = [];
    const allConstraints = new Set();
    const seenDecisionIds = new Set();

    for (const cp of checkpoints) {
      if (cp.claims.decisions) {
        for (const d of cp.claims.decisions) {
          if (!seenDecisionIds.has(d.id)) {
            seenDecisionIds.add(d.id);
            allDecisions.push(d);
          }
        }
      }
      if (cp.claims.constraints) {
        for (const c of cp.claims.constraints) {
          allConstraints.add(c);
        }
      }
    }

    if (allDecisions.length > 0) {
      lines.push('\n## Key Architectural Decisions');
      for (const d of allDecisions) {
        lines.push(`- **${d.id}: ${d.title}** — ${d.rationale}`);
      }
    }

    if (allConstraints.size > 0) {
      lines.push('\n## Invariant Constraints Enforced');
      for (const c of allConstraints) {
        lines.push(`- ⚠️ ${c}`);
      }
    }

    // Latest Next Steps across active tasks
    const latestCheckpoints = [];
    for (const tid of touchedTaskIds) {
      const taskCps = checkpoints.filter(c => c.task_id === tid);
      if (taskCps.length > 0) {
        latestCheckpoints.push(taskCps[taskCps.length - 1]);
      }
    }

    const upcomingSteps = [];
    for (const cp of latestCheckpoints) {
      if (cp.claims.next_steps && cp.claims.next_steps.length > 0) {
        for (const step of cp.claims.next_steps) {
          upcomingSteps.push(`[\`${cp.task_id}\`] ${step}`);
        }
      }
    }

    if (upcomingSteps.length > 0) {
      lines.push('\n## Current Next Steps');
      for (const step of upcomingSteps) {
        lines.push(`- [ ] ${step}`);
      }
    }

    return {
      recapText: lines.join('\n'),
      checkpoints,
      taskCount: touchedTaskIds.length
    };
  }
}
