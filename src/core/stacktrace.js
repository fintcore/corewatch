/**
 * Minimal cross-browser stack parser.
 * Produces frames the console transport can print and the server can later
 * resolve against source maps. Best-effort: never throws.
 */

// Chrome / Node / Edge:  "at fnName (file:line:col)"  or  "at file:line:col"
const CHROME_RE = /^\s*at (?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|([^)]+))\)?\s*$/;
// Firefox / Safari:  "fnName@file:line:col"  or  "@file:line:col"
const GECKO_RE = /^\s*(?:(.*?)@)?(.+?):(\d+):(\d+)\s*$/;

function toFrame(fn, file, line, col) {
  return {
    function: fn || '<anonymous>',
    filename: file || '',
    lineno: line ? parseInt(line, 10) : null,
    colno: col ? parseInt(col, 10) : null,
  };
}

export function parseStack(stack) {
  if (!stack || typeof stack !== 'string') return [];

  const frames = [];
  const lines = stack.split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let m = CHROME_RE.exec(line);
    if (m) {
      // m[5] is the "no function name" variant.
      const file = m[2] || m[5];
      frames.push(toFrame(m[1], file, m[3], m[4]));
      continue;
    }

    m = GECKO_RE.exec(line);
    if (m) {
      frames.push(toFrame(m[1], m[2], m[3], m[4]));
    }
  }

  return frames;
}

/** Normalize anything thrown into { type, value, stack: frames[] }. */
export function normalizeError(err) {
  // Thrown non-Error (string, object, number...)
  if (!(err instanceof Error)) {
    let value;
    try {
      value = typeof err === 'string' ? err : JSON.stringify(err);
    } catch (_) {
      value = String(err);
    }
    return {
      type: 'Error',
      value: value || 'Unknown error',
      stack: [], 
    };
  }

  return {
    type: err.name || 'Error',
    value: err.message || String(err),
    stack: parseStack(err.stack),
  };
}
