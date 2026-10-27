import { ErrorCode, VectorForceError } from './errors.js';

export const SCHEMA_VERSION_CHECKPOINT = 'vectorforce/checkpoint/v1';
export const SCHEMA_VERSION_RECEIPT = 'vectorforce/receipt/v1';
export const SCHEMA_VERSION_HANDOFF = 'vectorforce/handoff/v1';
export const SCHEMA_VERSION_MANIFEST = 'vectorforce/manifest/v1';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASK_ID_REGEX = /^[a-z0-9][a-z0-9-_]{1,63}$/;
const PROJECT_ID_REGEX = /^proj-[a-f0-9]{12,64}$/;
const SHA256_REGEX = /^[a-f0-9]{64}$/;
const GIT_SHA_REGEX = /^[a-f0-9]{40}$/;

/**
 * Validates a CheckpointRecordV1.
 * Throws VectorForceError if invalid.
 * @param {any} record
 */
export function validateCheckpoint(record) {
  if (!record || typeof record !== 'object') {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Checkpoint must be an object');
  }

  if (record.schema_version !== SCHEMA_VERSION_CHECKPOINT) {
    throw new VectorForceError(
      ErrorCode.SCHEMA_VALIDATION_FAILED,
      `Invalid schema_version: expected ${SCHEMA_VERSION_CHECKPOINT}`
    );
  }

  if (!UUID_REGEX.test(record.checkpoint_id)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid checkpoint_id: must be a valid UUID');
  }

  if (!PROJECT_ID_REGEX.test(record.project_id)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid project_id format');
  }

  if (!TASK_ID_REGEX.test(record.task_id)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid task_id: must be lowercase alphanumeric with hyphens/underscores (2-64 chars)');
  }

  if (record.parent_id !== null && !UUID_REGEX.test(record.parent_id)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'parent_id must be null or a valid UUID');
  }

  if (typeof record.timestamp !== 'string' || isNaN(Date.parse(record.timestamp))) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid timestamp: must be valid ISO-8601');
  }

  if (!record.author || typeof record.author !== 'object' || !record.author.name || !record.author.harness) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'author must contain name and harness');
  }

  if (typeof record.summary !== 'string' || record.summary.length < 5 || record.summary.length > 1000) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'summary must be string between 5 and 1000 chars');
  }

  // Validate Claims
  if (!record.claims || typeof record.claims !== 'object') {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'claims object is required');
  }
  const { goals, constraints, decisions, next_steps, open_questions } = record.claims;
  if (!Array.isArray(goals) || !Array.isArray(constraints) || !Array.isArray(decisions) || !Array.isArray(next_steps)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'claims must contain goals, constraints, decisions, and next_steps arrays');
  }

  // Validate Evidence
  if (!record.evidence || typeof record.evidence !== 'object') {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'evidence object is required');
  }
  const { git, documents, gaps } = record.evidence;
  if (git !== null && git !== undefined) {
    if (!GIT_SHA_REGEX.test(git.commit_hash) || typeof git.is_dirty !== 'boolean') {
      throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid git evidence: commit_hash and is_dirty required');
    }
  }

  if (documents && !Array.isArray(documents)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'documents evidence must be an array');
  }

  if (documents) {
    for (const doc of documents) {
      if (!doc.path || !SHA256_REGEX.test(doc.sha256) || typeof doc.size_bytes !== 'number' || doc.untrusted_content !== true) {
        throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Document evidence must include path, valid sha256, size_bytes, and untrusted_content: true');
      }
    }
  }

  if (gaps && !Array.isArray(gaps)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'gaps evidence must be an array');
  }

  return true;
}

/**
 * Validates an OperationReceiptV1.
 * @param {any} receipt
 */
export function validateReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Receipt must be an object');
  }
  if (receipt.schema_version !== SCHEMA_VERSION_RECEIPT) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, `Invalid receipt schema_version: expected ${SCHEMA_VERSION_RECEIPT}`);
  }
  if (!UUID_REGEX.test(receipt.operation_id)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'operation_id must be a valid UUID');
  }
  const validStatuses = ['committed', 'idempotent_replay', 'rejected', 'needs_selection', 'denied'];
  if (!validStatuses.includes(receipt.status)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, `Invalid status: ${receipt.status}`);
  }
  if (!SHA256_REGEX.test(receipt.request_hash)) {
    throw new VectorForceError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'request_hash must be a valid SHA-256 hex string');
  }
  return true;
}

/**
 * Validates a HandoffPackageV1.
 * @param {any} handoff
 */
export function validateHandoff(handoff) {
  if (!handoff || typeof handoff !== 'object') {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'Handoff must be an object');
  }
  if (handoff.schema_version !== SCHEMA_VERSION_HANDOFF) {
    throw new VectorForceError(
      ErrorCode.HANDOFF_VALIDATION_FAILED,
      `Invalid handoff schema_version: expected ${SCHEMA_VERSION_HANDOFF}`
    );
  }
  if (!handoff.package_id || typeof handoff.package_id !== 'string') {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'package_id is required');
  }
  if (typeof handoff.created_at !== 'string' || isNaN(Date.parse(handoff.created_at))) {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'created_at must be valid ISO-8601');
  }
  if (!handoff.origin || typeof handoff.origin !== 'object') {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'origin must be an object');
  }
  if (!handoff.origin.project_name || !handoff.origin.task_id) {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'origin must contain project_name and task_id');
  }
  if (!handoff.disclosure || typeof handoff.disclosure !== 'object' || !handoff.disclosure.recipient) {
    throw new VectorForceError(ErrorCode.HANDOFF_RECIPIENT_REQUIRED, 'disclosure.recipient is required');
  }
  if (!handoff.checkpoint || typeof handoff.checkpoint !== 'object') {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'checkpoint object is required in handoff');
  }
  const { summary, claims, evidence } = handoff.checkpoint;
  if (typeof summary !== 'string' || !claims || !evidence) {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'checkpoint must contain summary, claims, and evidence');
  }
  if (!Array.isArray(claims.goals) || !Array.isArray(claims.constraints) || !Array.isArray(claims.decisions) || !Array.isArray(claims.next_steps)) {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'claims must contain goals, constraints, decisions, and next_steps');
  }
  return true;
}

/**
 * Validates a HandoffManifestV1.
 * @param {any} manifest
 */
export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'Manifest must be an object');
  }
  if (manifest.schema_version !== SCHEMA_VERSION_MANIFEST) {
    throw new VectorForceError(
      ErrorCode.HANDOFF_VALIDATION_FAILED,
      `Invalid manifest schema_version: expected ${SCHEMA_VERSION_MANIFEST}`
    );
  }
  if (!manifest.package_id || typeof manifest.package_id !== 'string') {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'Manifest package_id is required');
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new VectorForceError(ErrorCode.HANDOFF_VALIDATION_FAILED, 'Manifest must contain a non-empty files array');
  }
  for (const file of manifest.files) {
    if (!file.path || !SHA256_REGEX.test(file.sha256) || typeof file.size_bytes !== 'number') {
      throw new VectorForceError(
        ErrorCode.HANDOFF_VALIDATION_FAILED,
        'Manifest file entry must include path, valid sha256, and size_bytes'
      );
    }
  }
  return true;
}

