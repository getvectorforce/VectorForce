import { readdirSync, readFileSync, statSync, realpathSync } from 'node:fs';
import { join, extname, posix } from 'node:path';
import { sha256 } from '../core/hash.js';
import { Authorizer } from '../policy/authorizer.js';

export const DEFAULT_MAX_FILES = 2000;
export const DEFAULT_MAX_FILE_BYTES = 200000;
export const SNIPPET_LINES = 40;
export const SNIPPET_MAX_CHARS = 4000;

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.vectorforce',
  '.commandcode', '.agents', 'tmp', '.next', '.cache', 'out', 'vendor', 'target'
]);

const SKIP_FILE_PATTERNS = [
  /^\.env($|\.)/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /credentials/i,
  /secret/i,
  /^id_(rsa|dsa|ecdsa|ed25519)/i,
  /^\.npmrc$/i
];

const CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs',
  '.java', '.rb', '.sql', '.sh', '.md', '.json', '.yaml', '.yml'
]);

const LANGUAGE_BY_EXT = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript', '.py': 'python', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.rb': 'ruby', '.sql': 'sql', '.sh': 'shell', '.md': 'markdown',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml'
};

const RESOLUTION_SUFFIXES = [
  '', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
  '/index.js', '/index.ts', '/index.jsx', '/index.tsx'
];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'when', 'then', 'than',
  'are', 'was', 'were', 'will', 'should', 'must', 'add', 'use', 'via', 'per', 'not',
  'but', 'you', 'your', 'our', 'its', 'has', 'have', 'had', 'can', 'may', 'all', 'any',
  'new', 'old', 'out', 'one', 'two', 'task', 'code', 'work'
]);

function uniqueMatches(content, regex, group = 1) {
  const seen = new Set();
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(content)) !== null) {
    const value = match[group];
    if (value) seen.add(value);
  }
  return Array.from(seen);
}

/**
 * Deterministic, dependency-free index of a workspace's source tree.
 * Extracts a structural skeleton (files, symbols, import edges) that a language
 * model can reason over. Never follows symlinks and never escapes the workspace.
 */
export class CodeIndexProvider {
  /**
   * Build a structural index of the workspace.
   * @param {string} canonicalWorkspace
   * @param {{ maxFiles?: number, maxFileBytes?: number }} [opts]
   * @returns {{ files: Array<object>, edges: Array<object>, truncated: boolean, gaps: Array<object> }}
   */
  static build(canonicalWorkspace, opts = {}) {
    const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
    const maxFileBytes = opts.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    const root = realpathSync(canonicalWorkspace);

    const files = [];
    const gaps = [];
    let truncated = false;

    const walk = (dir, relDir) => {
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch (err) {
        gaps.push({ type: 'code', target: relDir || '.', reason: `readdir failed: ${err.message}` });
        return;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of entries) {
        if (files.length >= maxFiles) {
          truncated = true;
          return;
        }
        const name = entry.name;
        const abs = join(dir, name);
        const rel = relDir ? `${relDir}/${name}` : name;

        if (entry.isSymbolicLink()) continue;

        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(name)) continue;
          walk(abs, rel);
          continue;
        }
        if (!entry.isFile()) continue;
        if (CodeIndexProvider._isSecretPath(name, rel)) continue;

        const ext = extname(name).toLowerCase();
        if (!CODE_EXTENSIONS.has(ext)) continue;
        if (!Authorizer.isWithinWorkspace(root, abs)) continue;

        let st;
        try {
          st = statSync(abs);
        } catch {
          continue;
        }
        if (st.size > maxFileBytes) {
          gaps.push({ type: 'code', target: rel, reason: `Skipped: ${st.size} bytes exceeds ${maxFileBytes} byte limit` });
          continue;
        }

        let content;
        try {
          content = readFileSync(abs, 'utf8');
        } catch (err) {
          gaps.push({ type: 'code', target: rel, reason: `read failed: ${err.message}` });
          continue;
        }
        if (content.includes('\u0000')) continue;

        const language = LANGUAGE_BY_EXT[ext] || ext.slice(1);
        files.push({
          path: rel,
          size: st.size,
          sha256: sha256(content),
          language,
          symbols: CodeIndexProvider.extractSymbols(content, language),
          snippet: CodeIndexProvider._snippet(content)
        });
      }
    };

    walk(root, '');

    return {
      files,
      edges: CodeIndexProvider._buildEdges(files),
      truncated,
      gaps
    };
  }

  /**
   * Extract a structural symbol skeleton using deterministic regex heuristics.
   * @param {string} content
   * @param {string} language
   * @returns {{ exports: string[], imports: string[], functions: string[], classes: string[] }}
   */
  static extractSymbols(content, language) {
    const result = { exports: [], imports: [], functions: [], classes: [] };

    if (language === 'javascript' || language === 'typescript') {
      result.imports = uniqueMatches(content, /(?:import\s+(?:[^'"]*?\s+from\s+)?|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g);
      result.exports = uniqueMatches(content, /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g);
      result.exports.push(...uniqueMatches(content, /\bmodule\.exports\s*=\s*([A-Za-z_$][\w$]*)/g));
      result.functions = uniqueMatches(content, /\bfunction\s+([A-Za-z_$][\w$]*)/g);
      result.functions.push(...uniqueMatches(content, /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g));
      result.classes = uniqueMatches(content, /\bclass\s+([A-Za-z_$][\w$]*)/g);
    } else if (language === 'python') {
      result.imports = uniqueMatches(content, /^\s*(?:import|from)\s+([\w.]+)/gm);
      result.functions = uniqueMatches(content, /^\s*def\s+([A-Za-z_]\w*)/gm);
      result.classes = uniqueMatches(content, /^\s*class\s+([A-Za-z_]\w*)/gm);
      result.exports = result.functions.slice();
    }

    for (const key of Object.keys(result)) {
      result[key] = Array.from(new Set(result[key])).slice(0, 50);
    }
    return result;
  }

  /**
   * Select the most relevant files for a reasoning task, deterministically.
   * Ranking: changed-since-checkpoint > token match in path/symbols > entry points.
   * @param {object} index result of build()
   * @param {{ queryTokens?: string[], changedFiles?: string[], limit?: number, byteBudget?: number }} [opts]
   * @returns {{ files: Array<object>, usedBytes: number }}
   */
  static selectRelevantFiles(index, opts = {}) {
    const limit = opts.limit ?? 12;
    const byteBudget = opts.byteBudget ?? 48000;
    const tokenSet = new Set((opts.queryTokens || []).map(t => String(t).toLowerCase()).filter(Boolean));
    const changed = new Set(opts.changedFiles || []);
    const entryPoints = new Set([
      'package.json', 'readme.md', 'index.js', 'index.ts', 'src/index.js', 'src/index.ts',
      'main.js', 'main.py', 'app.py', 'app.js', 'app.ts', 'pyproject.toml'
    ]);

    const scored = index.files.map(file => {
      let score = 0;
      const hay = `${file.path} ${file.symbols.exports.join(' ')} ${file.symbols.functions.join(' ')} ${file.symbols.classes.join(' ')}`.toLowerCase();
      for (const token of tokenSet) {
        if (token.length >= 3 && hay.includes(token)) score += 2;
      }
      if (changed.has(file.path)) score += 5;
      if (entryPoints.has(file.path.toLowerCase())) score += 3;
      return { file, score };
    });

    scored.sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));

    const selected = [];
    let usedBytes = 0;
    for (const { file, score } of scored) {
      if (selected.length >= limit) break;
      const size = file.snippet.length;
      if (usedBytes + size > byteBudget) continue;
      selected.push({
        path: file.path,
        language: file.language,
        symbols: file.symbols,
        snippet: file.snippet,
        changed: changed.has(file.path),
        score
      });
      usedBytes += size;
    }

    return { files: selected, usedBytes };
  }

  /**
   * Tokenize free text into relevance keywords (lowercased, dedupliced, stopwords removed).
   * @param {...string} texts
   * @returns {string[]}
   */
  static tokenize(...texts) {
    const tokens = new Set();
    for (const text of texts) {
      if (!text) continue;
      for (const raw of String(text).toLowerCase().split(/[^a-z0-9_]+/)) {
        if (raw.length >= 3 && !STOPWORDS.has(raw)) tokens.add(raw);
      }
    }
    return Array.from(tokens);
  }

  static _isSecretPath(name, rel) {
    return SKIP_FILE_PATTERNS.some(re => re.test(name) || re.test(rel));
  }

  static _snippet(content) {
    let snippet = content.split('\n').slice(0, SNIPPET_LINES).join('\n');
    if (snippet.length > SNIPPET_MAX_CHARS) snippet = snippet.slice(0, SNIPPET_MAX_CHARS);
    return snippet;
  }

  static _buildEdges(files) {
    const known = new Set(files.map(f => f.path));
    const edges = [];
    const seen = new Set();

    for (const file of files) {
      const dir = posix.dirname(file.path);
      for (const spec of file.symbols.imports) {
        if (!spec.startsWith('.')) continue;
        const base = posix.normalize(posix.join(dir, spec));
        const hit = RESOLUTION_SUFFIXES.map(suffix => base + suffix).find(candidate => known.has(candidate));
        if (!hit || hit === file.path) continue;
        const key = `${file.path}->${hit}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: file.path, to: hit });
      }
    }

    return edges;
  }
}
