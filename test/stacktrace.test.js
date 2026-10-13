import { describe, expect, it } from 'vitest';
import { normalizeError, parseStack } from '../src/core/stacktrace.js';

describe('parseStack', () => {
  it('parses Chrome/V8 frames with and without function names', () => {
    const stack = [
      "TypeError: Cannot read properties of undefined (reading 'name')",
      '    at BrokenWidget (http://localhost:3000/static/js/70.chunk.js:1903:25)',
      '    at http://localhost:3000/static/js/main.chunk.js:10:5',
    ].join('\n');

    expect(parseStack(stack)).toEqual([
      { function: 'BrokenWidget', filename: 'http://localhost:3000/static/js/70.chunk.js', lineno: 1903, colno: 25 },
      { function: '<anonymous>', filename: 'http://localhost:3000/static/js/main.chunk.js', lineno: 10, colno: 5 },
    ]);
  });

  it('parses Gecko/Safari frames', () => {
    const stack = 'render@https://app.io/assets/index.js:12:34\n@https://app.io/assets/vendor.js:1:2';

    expect(parseStack(stack)).toEqual([
      { function: 'render', filename: 'https://app.io/assets/index.js', lineno: 12, colno: 34 },
      { function: '<anonymous>', filename: 'https://app.io/assets/vendor.js', lineno: 1, colno: 2 },
    ]);
  });

  it('cleans Hermes bytecode frames from React Native', () => {
    const stack = [
      'TypeError: undefined is not a function',
      '    at onPress (address at index.android.bundle:1:345678)',
      '    at anonymous (native)',
      '    at Pressable (http://192.168.1.5:8081/index.bundle?platform=ios&dev=true:1234:56)',
    ].join('\n');

    expect(parseStack(stack)).toEqual([
      { function: 'onPress', filename: 'index.android.bundle', lineno: 1, colno: 345678 },
      { function: 'anonymous', filename: 'native', lineno: null, colno: null },
      { function: 'Pressable', filename: 'http://192.168.1.5:8081/index.bundle?platform=ios&dev=true', lineno: 1234, colno: 56 },
    ]);
  });

  it('returns an empty list for missing or non-string stacks', () => {
    expect(parseStack(undefined)).toEqual([]);
    expect(parseStack(42)).toEqual([]);
    expect(parseStack('')).toEqual([]);
  });
});

describe('normalizeError', () => {
  it('keeps the type, message and frames of an Error', () => {
    const err = new RangeError('Invalid time value');
    const out = normalizeError(err);

    expect(out.type).toBe('RangeError');
    expect(out.value).toBe('Invalid time value');
    expect(out.stack.length).toBeGreaterThan(0);
  });

  it('wraps thrown non-errors', () => {
    expect(normalizeError('boom')).toEqual({ type: 'Error', value: 'boom', stack: [] });
    expect(normalizeError({ code: 7 })).toEqual({ type: 'Error', value: '{"code":7}', stack: [] });
  });

  it('never throws on unserializable values', () => {
    const cyclic = {};
    cyclic.self = cyclic;

    expect(() => normalizeError(cyclic)).not.toThrow();
    expect(normalizeError(cyclic).type).toBe('Error');
  });
});
