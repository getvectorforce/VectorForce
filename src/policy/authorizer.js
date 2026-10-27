import { resolve, normalize, isAbsolute, relative, sep } from 'node:path';
import { realpathSync, statSync, lstatSync } from 'node:fs';
import { ErrorCode, VectorForceError } from '../core/errors.js';

export const MAX_FILE_BYTES = 8192; // 8 KiB per file
export const MAX_TOTAL_DOCUMENT_BYTES = 65536; // 64 KiB total
export const ALLOWED_EXTENSIONS = ['.md', '.txt'];
export const APPROVED_DESTINATIONS = ['antigravity', 'command-code', 'muse', 'muse-code', 'pi', 'codex', 'cli'];

export class Authorizer {
  /**
   * Validate that a workspace path is an existing, canonical directory.
   * @param {string} workspacePath
   * @returns {string} canonical absolute path
   */
  static canonicalizeWorkspace(workspacePath) {
    try {
      const real = realpathSync(workspacePath);
      const st = statSync(real);
      if (!st.isDirectory()) {
        throw new VectorForceError(ErrorCode.POLICY_DENIED, `Workspace path is not a directory: ${workspacePath}`);
      }
      return real;
    } catch (err) {
      if (err instanceof VectorForceError) throw err;
      throw new VectorForceError(ErrorCode.POLICY_DENIED, `Cannot access workspace path: ${workspacePath}`);
    }
  }

  /**
   * Determine whether an absolute path resolves inside the canonical workspace.
   * Falls back to lexical resolution when the target does not exist yet.
   * @param {string} canonicalWorkspace
   * @param {string} absPath
   * @returns {boolean}
   */
  static isWithinWorkspace(canonicalWorkspace, absPath) {
    const base = realpathSync(canonicalWorkspace);
    let target;
    try {
      target = realpathSync(absPath);
    } catch {
      target = resolve(absPath);
    }
    return target === base || target.startsWith(base + sep);
  }

  /**
   * Validate a requested document relative path against path traversal and file rules.
   * @param {string} canonicalWorkspace
   * @param {string} relativeDocPath
   * @returns {string} canonical absolute file path
   */
  static validateDocumentPath(canonicalWorkspace, relativeDocPath) {
    if (!relativeDocPath || typeof relativeDocPath !== 'string') {
      throw new VectorForceError(ErrorCode.PATH_TRAVERSAL_DETECTED, 'Invalid document path: must be a non-empty string');
    }

    const realWorkspace = realpathSync(canonicalWorkspace);

    // Must not be absolute
    if (isAbsolute(relativeDocPath)) {
      throw new VectorForceError(ErrorCode.PATH_TRAVERSAL_DETECTED, `Absolute document paths forbidden: ${relativeDocPath}`);
    }

    // Must not contain backward slashes (Windows style) or '..' segments
    if (relativeDocPath.includes('\\') || relativeDocPath.split('/').includes('..')) {
      throw new VectorForceError(ErrorCode.PATH_TRAVERSAL_DETECTED, `Path traversal sequence '..' detected: ${relativeDocPath}`);
    }

    // Extension check
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => relativeDocPath.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      throw new VectorForceError(
        ErrorCode.POLICY_DENIED,
        `Document extension forbidden: ${relativeDocPath}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
    }

    const fullPath = resolve(realWorkspace, relativeDocPath);

    // Verify it doesn't escape workspace
    const rel = relative(realWorkspace, fullPath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new VectorForceError(ErrorCode.DOCUMENT_OUTSIDE_WORKSPACE, `Document escapes workspace: ${relativeDocPath}`);
    }

    // Check lstat to detect symlinks
    let lst;
    try {
      lst = lstatSync(fullPath);
    } catch (err) {
      // File does not exist - provider handles missing file as an explicit evidence gap
      return fullPath;
    }

    if (lst.isSymbolicLink()) {
      throw new VectorForceError(ErrorCode.POLICY_DENIED, `Symbolic links forbidden for document collection: ${relativeDocPath}`);
    }

    if (!lst.isFile()) {
      throw new VectorForceError(ErrorCode.POLICY_DENIED, `Target is not a regular file: ${relativeDocPath}`);
    }

    // Check canonical realpath containment
    const real = realpathSync(fullPath);
    if (!Authorizer.isWithinWorkspace(realWorkspace, real)) {
      throw new VectorForceError(ErrorCode.DOCUMENT_OUTSIDE_WORKSPACE, `Resolved realpath escapes workspace: ${real}`);
    }

    return real;
  }

  /**
   * Validate that all requested documents are present in the project's exact allowlist.
   * @param {string[]} requestedDocs
   * @param {string[]} allowedPaths
   */
  static authorizeDocumentSelection(requestedDocs, allowedPaths) {
    if (!requestedDocs || requestedDocs.length === 0) return true;
    const allowedSet = new Set(allowedPaths);
    for (const doc of requestedDocs) {
      if (!allowedSet.has(doc)) {
        throw new VectorForceError(
          ErrorCode.POLICY_DENIED,
          `Document path '${doc}' is not in project allowlist. Run 'vf policy' to permit it.`
        );
      }
    }
    return true;
  }

  /**
   * Check destination harness authorization for briefing consumption.
   * @param {string} destination
   */
  static authorizeDestination(destination) {
    if (!destination) return true; // Default allowed
    if (!APPROVED_DESTINATIONS.includes(destination)) {
      throw new VectorForceError(
        ErrorCode.UNAUTHORIZED_DESTINATION,
        `Destination '${destination}' is not in approved list: ${APPROVED_DESTINATIONS.join(', ')}`
      );
    }
    return true;
  }
}
