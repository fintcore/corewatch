/**
 * PII / secret scrubbing. Runs before an event leaves the browser.
 * Keeps events useful while masking sensitive values.
 *
 * NOTE (project rule): never let real credentials or PII reach a transport.
 */

const DEFAULT_DENY_KEYS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'auth',
  'apikey',
  'api_key',
  'session',
  'cookie',
  'card',
  'cardnumber',
  'cvv',
  'cvc',
  'ssn',
  'curp',
  'rfc',
  'clabe',
  'email',
  'phone',
  'creditcard',
];

const MASK = '[Filtered]';
const MAX_DEPTH = 6;

function keyIsSensitive(key, denyKeys) {
  const k = String(key).toLowerCase();
  return denyKeys.some((deny) => k.includes(deny));
}

/**
 * Recursively clone `input`, masking sensitive keys and cutting cycles.
 * @param {*} input
 * @param {string[]} denyKeys
 * @param {number} depth
 * @param {WeakSet} seen
 */
export function sanitize(input, denyKeys = DEFAULT_DENY_KEYS, depth = 0, seen = new WeakSet()) {
  if (input === null || typeof input !== 'object') return input;
  if (depth > MAX_DEPTH) return '[MaxDepth]';
  if (seen.has(input)) return '[Circular]';
  seen.add(input);

  if (Array.isArray(input)) {
    return input.slice(0, 100).map((v) => sanitize(v, denyKeys, depth + 1, seen));
  }

  const out = {};
  for (const key of Object.keys(input)) {
    if (keyIsSensitive(key, denyKeys)) {
      out[key] = MASK;
      continue;
    }
    try {
      out[key] = sanitize(input[key], denyKeys, depth + 1, seen);
    } catch (_) {
      out[key] = '[Unserializable]';
    }
  }
  return out;
}

export { DEFAULT_DENY_KEYS };
