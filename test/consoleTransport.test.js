import { describe, expect, it, vi } from 'vitest';
import { createConsoleTransport } from '../src/transports/consoleTransport.js';
import { buildEvent } from '../src/core/event.js';

const event = buildEvent({ error: new TypeError('bad') }, { project: 'app' }, { user: null, tags: {}, extra: {}, breadcrumbs: [] });

describe('createConsoleTransport', () => {
  it('prints a styled collapsed group by default', () => {
    const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    createConsoleTransport().send(event);

    expect(group.mock.calls[0][0]).toBe('%cERROR%c TypeError: bad');
    expect(group.mock.calls[0][1]).toContain('background');
  });

  it('prints plain text when styled is false', () => {
    const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    createConsoleTransport({ styled: false }).send(event);

    expect(group).toHaveBeenCalledWith('[CoreWatch] ERROR TypeError: bad');
  });
});
