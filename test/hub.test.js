import { afterEach, describe, expect, it, vi } from 'vitest';
import * as hub from '../src/core/hub.js';

afterEach(() => hub._resetClient());

const memory = () => {
  const sent = [];
  return { sent, transport: { name: 'memory', send: (e) => sent.push(e) } };
};

describe('hub', () => {
  it('warns instead of throwing before init()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(hub.captureException(new Error('early'))).toBeUndefined();
    expect(warn).toHaveBeenCalledWith('[CoreWatch] called before init(); ignored.');
  });

  it('is idempotent', () => {
    const first = hub.initClient({ project: 'first' });
    const second = hub.initClient({ project: 'second' });
    expect(second).toBe(first);
    expect(hub.getClient().config.project).toBe('first');
  });

  it('wires the platform adapter', () => {
    const { sent, transport } = memory();
    const setup = vi.fn();
    hub.initClient({}, {
      name: 'test',
      getContext: () => ({ runtime: 'test' }),
      defaultTransports: () => [transport],
      setup,
    });
    hub.captureMessage('hi');

    expect(setup).toHaveBeenCalledOnce();
    expect(sent[0].context).toEqual({ runtime: 'test' });
  });

  it('prefers config.transports over the platform defaults', () => {
    const fromConfig = memory();
    const fromPlatform = memory();
    hub.initClient({ transports: [fromConfig.transport] }, { defaultTransports: () => [fromPlatform.transport] });
    hub.captureMessage('hi');

    expect(fromConfig.sent).toHaveLength(1);
    expect(fromPlatform.sent).toHaveLength(0);
  });

  it('survives a failing platform setup', () => {
    expect(() => hub.initClient({}, { setup: () => { throw new Error('no window'); } })).not.toThrow();
    expect(hub.getClient()).not.toBeNull();
  });

  it('flush() is a no-op before init and delegates to the client after', async () => {
    await expect(hub.flush()).resolves.toBeUndefined();
    const flushed = vi.fn();
    hub.initClient({ transports: [{ name: 't', send() {}, flush: flushed }] });
    await hub.flush();
    expect(flushed).toHaveBeenCalledWith(true);
  });

  it('maps logger methods to levels', () => {
    const { sent, transport } = memory();
    hub.initClient({ transports: [transport] });
    hub.logger.fatal('a');
    hub.logger.warn('b');
    hub.logger.debug('c');

    expect(sent.map((e) => e.level)).toEqual(['fatal', 'warning', 'debug']);
  });

  it('applies scope setters to later events', () => {
    const { sent, transport } = memory();
    hub.initClient({ transports: [transport] });
    hub.setUser({ id: '42' });
    hub.setTag('route', '/x');
    hub.setExtra('step', 3);
    hub.addBreadcrumb({ message: 'clicked' });
    hub.captureMessage('m');

    expect(sent[0]).toMatchObject({ user: { id: '42' }, tags: { route: '/x' }, extra: { step: 3 } });
    expect(sent[0].breadcrumbs[0].message).toBe('clicked');
  });
});
