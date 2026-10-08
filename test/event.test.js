import { describe, expect, it } from 'vitest';
import { buildEvent } from '../src/core/event.js';
import { SDK } from '../src/core/sdk.js';

const scope = { user: { id: '1' }, tags: { t: 1 }, extra: { e: 1 }, breadcrumbs: [] };

describe('buildEvent', () => {
  it('builds the event contract from an exception', () => {
    const event = buildEvent(
      { error: new TypeError('bad'), mechanism: 'onerror' },
      { project: 'Core Panel', release: '1.2.0', environment: 'production' },
      scope,
      { componentStack: 'in App' },
      { url: 'https://app.io/x' },
    );

    expect(event).toMatchObject({
      level: 'error',
      message: 'TypeError: bad',
      mechanism: 'onerror',
      project: 'core-panel',
      release: '1.2.0',
      environment: 'production',
      context: { url: 'https://app.io/x' },
      user: { id: '1' },
      tags: { t: 1 },
      extra: { e: 1, componentStack: 'in App' },
      sdk: SDK,
    });
    expect(event.exception).toMatchObject({ type: 'TypeError', value: 'bad' });
    expect(event.eventId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('defaults to info and no exception for messages', () => {
    const event = buildEvent({ message: 'hello' }, {}, scope);
    expect(event).toMatchObject({ level: 'info', message: 'hello', exception: null, mechanism: 'manual', project: null });
    expect(event.context).toMatchObject({ sdk: SDK });
  });

  it('normalizes the project into a slug', () => {
    const slug = (project) => buildEvent({ message: 'x' }, { project }, scope).project;
    expect(slug('  Arrendamiento Seller Panel ')).toBe('arrendamiento-seller-panel');
    expect(slug('core_panel.v2')).toBe('core_panel.v2');
    expect(slug('---')).toBeNull();
    expect(slug(42)).toBeNull();
  });

  it('generates unique event ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => buildEvent({ message: 'x' }, {}, scope).eventId));
    expect(ids.size).toBe(200);
  });
});
