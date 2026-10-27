import { createHash, randomUUID } from 'node:crypto';

/**
 * Compute SHA-256 hex digest of a string or buffer.
 * @param {string|Buffer} data
 * @returns {string} 64-character lowercase hex string
 */
export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random UUIDv4.
 * @returns {string}
 */
export function generateUuid() {
  return randomUUID();
}

/**
 * Recursively sort keys in an object to produce deterministic JSON.
 * @param {any} value
 * @returns {any}
 */
export function canonicalizeValue(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  const sorted = {};
  const keys = Object.keys(value).sort();
  for (const k of keys) {
    sorted[k] = canonicalizeValue(value[k]);
  }
  return sorted;
}

/**
 * Produce deterministic canonical JSON string.
 * @param {any} value
 * @returns {string}
 */
export function canonicalizeJson(value) {
  return JSON.stringify(canonicalizeValue(value));
}

/**
 * Hash a request payload deterministically for idempotency.
 * @param {any} payload
 * @returns {string} SHA-256 hex
 */
export function hashRequestPayload(payload) {
  return sha256(canonicalizeJson(payload));
}
