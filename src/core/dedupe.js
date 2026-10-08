/**
 * Drops duplicate events fired in a short window (e.g. an error thrown inside
 * a render loop, or the same rejection bubbling twice). Keeps a small ring of
 * recent signatures.
 */

const RING_SIZE = 30;

export function createDeduper() {
  const recent = [];

  function signature(event) {
    const ex = event.exception || {};
    const topFrames = (ex.stack || [])
      .slice(0, 3)
      .map((f) => `${f.function}@${f.filename}:${f.lineno}`)
      .join('|');
    return [event.level, ex.type, ex.value, event.message, topFrames]
      .filter(Boolean)
      .join('::');
  }

  return {
    isDuplicate(event) {
      const sig = signature(event);
      if (recent.includes(sig)) return true;
      recent.push(sig);
      if (recent.length > RING_SIZE) recent.shift();
      return false;
    },
  };
}
