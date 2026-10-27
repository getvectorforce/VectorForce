import { readFileSync, statSync } from 'node:fs';
import { Authorizer, MAX_FILE_BYTES, MAX_TOTAL_DOCUMENT_BYTES } from '../policy/authorizer.js';
import { sha256 } from '../core/hash.js';
import { ErrorCode, VectorForceError } from '../core/errors.js';

export class DocumentProvider {
  /**
   * Collect allowlisted documents safely.
   * @param {string} canonicalWorkspace
   * @param {string[]} requestedPaths Relative paths
   * @param {string[]} allowedPaths Project allowlist
   * @returns {{ documents: Array<object>, gaps: Array<object> }}
   */
  static collect(canonicalWorkspace, requestedPaths = [], allowedPaths = []) {
    if (!requestedPaths || requestedPaths.length === 0) {
      return { documents: [], gaps: [] };
    }

    if (requestedPaths.length > 8) {
      throw new VectorForceError(
        ErrorCode.POLICY_DENIED,
        `Too many documents requested: ${requestedPaths.length}. Maximum is 8.`
      );
    }

    // 1. Check authorization against allowlist
    Authorizer.authorizeDocumentSelection(requestedPaths, allowedPaths);

    // 2. Canonicalize path order (sort uniquely)
    const uniqueSorted = Array.from(new Set(requestedPaths)).sort();

    const documents = [];
    const gaps = [];
    let totalBytes = 0;

    for (const relPath of uniqueSorted) {
      const fullPath = Authorizer.validateDocumentPath(canonicalWorkspace, relPath);

      // Check existence and stat
      let st;
      try {
        st = statSync(fullPath);
      } catch {
        gaps.push({
          type: 'document',
          target: relPath,
          reason: 'File does not exist or is inaccessible'
        });
        continue;
      }

      if (st.size > MAX_FILE_BYTES) {
        throw new VectorForceError(
          ErrorCode.DOCUMENT_TOO_LARGE,
          `Document '${relPath}' exceeds maximum file size (${st.size} bytes > ${MAX_FILE_BYTES} bytes limit)`
        );
      }

      if (totalBytes + st.size > MAX_TOTAL_DOCUMENT_BYTES) {
        throw new VectorForceError(
          ErrorCode.TOTAL_DOCUMENTS_TOO_LARGE,
          `Total document size exceeds limit (${totalBytes + st.size} bytes > ${MAX_TOTAL_DOCUMENT_BYTES} bytes limit)`
        );
      }

      // Read buffer
      let buffer;
      try {
        buffer = readFileSync(fullPath);
      } catch (err) {
        gaps.push({
          type: 'document',
          target: relPath,
          reason: `Read failed: ${err.message}`
        });
        continue;
      }

      // Check for NUL byte
      if (buffer.includes(0x00)) {
        throw new VectorForceError(
          ErrorCode.INVALID_DOCUMENT_CONTENT,
          `Document '${relPath}' contains invalid binary or NUL bytes`
        );
      }

      const contentStr = buffer.toString('utf8');
      const hash = sha256(buffer);
      const collectedAt = new Date().toISOString();

      documents.push({
        path: relPath,
        sha256: hash,
        size_bytes: st.size,
        collected_at: collectedAt,
        content: contentStr,
        untrusted_content: true
      });

      totalBytes += st.size;
    }

    return { documents, gaps };
  }
}
