import { describe, expect, it } from 'vitest';
import { createDeduper } from '../src/core/dedupe.js';

const event = (value, fn = 'render') => ({
  level: 'error',
  message: `TypeError: ${value}`,
  exception: { type: 'TypeError', value, stack: [{ function: fn, filename: 'app.js', lineno: 1 }] },
});

describe('createDeduper', () => {
  it('drops an identical event', () => {
    const dedupe = createDeduper();
    expect(dedupe.isDuplicate(event('x'))).toBe(false);
    expect(dedupe.isDuplicate(event('x'))).toBe(true);
  });

  it('keeps events that differ in value or top frames', () => {
    const dedupe = createDeduper();
    expect(dedupe.isDuplicate(event('x'))).toBe(false);
    expect(dedupe.isDuplicate(event('y'))).toBe(false);
    expect(dedupe.isDuplicate(event('x', 'other'))).toBe(false);
  });

  it('forgets a signature after 30 newer distinct events', () => {
    const dedupe = createDeduper();
    dedupe.isDuplicate(event('first'));
    for (let i = 0; i < 30; i += 1) dedupe.isDuplicate(event(`e${i}`));

    expect(dedupe.isDuplicate(event('first'))).toBe(false);
  });
});
