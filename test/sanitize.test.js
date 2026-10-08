import { describe, expect, it } from 'vitest';
import { DEFAULT_DENY_KEYS, sanitize } from '../src/core/sanitize.js';

describe('sanitize', () => {
  it('masks sensitive keys at any depth', () => {
    const out = sanitize({
      id: 7,
      password: 'hunter2',
      profile: { curp: 'XXXX000000HDFXXX00', name: 'Ana' },
      headers: { Authorization: 'Bearer abc' },
    });

    expect(out).toEqual({
      id: 7,
      password: '[Filtered]',
      profile: { curp: '[Filtered]', name: 'Ana' },
      headers: { Authorization: '[Filtered]' },
    });
  });

  it('matches keys by case-insensitive substring', () => {
    expect(sanitize({ userEmail: 'a@b.c', refreshTokenValue: 'x' })).toEqual({
      userEmail: '[Filtered]',
      refreshTokenValue: '[Filtered]',
    });
  });

  it('includes Mexican identifiers in the default deny list', () => {
    expect(DEFAULT_DENY_KEYS).toEqual(expect.arrayContaining(['curp', 'rfc', 'clabe']));
  });

  it('accepts a custom deny list', () => {
    expect(sanitize({ nss: '123', name: 'Ana' }, ['nss'])).toEqual({ nss: '[Filtered]', name: 'Ana' });
  });

  it('does not mutate the input', () => {
    const input = { password: 'x' };
    sanitize(input);
    expect(input.password).toBe('x');
  });

  it('cuts cycles and deep nesting', () => {
    const cyclic = { a: 1 };
    cyclic.self = cyclic;
    expect(sanitize(cyclic)).toEqual({ a: 1, self: '[Circular]' });

    let deep = { leaf: true };
    for (let i = 0; i < 10; i += 1) deep = { child: deep };
    expect(JSON.stringify(sanitize(deep))).toContain('[MaxDepth]');
  });

  it('keeps an object that is referenced twice without a cycle', () => {
    const shared = { route: '/dashboard' };
    expect(sanitize({ from: shared, to: shared })).toEqual({ from: shared, to: shared });
  });

  it('truncates long arrays', () => {
    expect(sanitize(Array.from({ length: 150 }, (_, i) => i))).toHaveLength(100);
  });

  it('returns primitives untouched', () => {
    expect(sanitize('text')).toBe('text');
    expect(sanitize(null)).toBe(null);
    expect(sanitize(3)).toBe(3);
  });
});
