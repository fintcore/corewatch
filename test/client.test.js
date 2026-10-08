import { describe, expect, it, vi } from 'vitest';
import { createClient } from '../src/core/client.js';

function setup(config = {}, options) {
  const sent = [];
  const client = createClient(config, [{ name: 'memory', send: (e) => sent.push(e) }], options);
  return { client, sent };
}

describe('createClient', () => {
  it('sends captured exceptions and messages to every transport', () => {
    const other = [];
    const sent = [];
    const client = createClient({}, [
      { name: 'a', send: (e) => sent.push(e) },
      { name: 'b', send: (e) => other.push(e) },
    ]);

    const id = client.captureException(new Error('boom'));
    client.captureMessage('hello', 'warning');

    expect(id).toBe(sent[0].eventId);
    expect(sent.map((e) => e.level)).toEqual(['error', 'warning']);
    expect(other).toHaveLength(2);
  });

  it('does nothing when disabled', () => {
    const { client, sent } = setup({ enabled: false });
    expect(client.captureException(new Error('x'))).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it('applies ignoreErrors strings and regular expressions', () => {
    const { client, sent } = setup({ ignoreErrors: ['ResizeObserver loop', /^ChunkLoadError/] });
    client.captureMessage('ResizeObserver loop limit exceeded');
    client.captureException(Object.assign(new Error('Loading chunk 70 failed.'), { name: 'ChunkLoadError' }));
    client.captureMessage('kept');

    expect(sent.map((e) => e.message)).toEqual(['kept']);
  });

  it('drops duplicates', () => {
    const { client, sent } = setup();
    const err = new Error('same');
    client.captureException(err);
    client.captureException(err);
    expect(sent).toHaveLength(1);
  });

  it('respects sampleRate', () => {
    const { client, sent } = setup({ sampleRate: 0.5 });
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    client.captureMessage('dropped');
    expect(sent).toHaveLength(0);
  });

  it('scrubs user, extra, tags and breadcrumbs', () => {
    const { client, sent } = setup({ user: { id: '1', email: 'a@b.c' } });
    client.setTag('authToken', 'x');
    client.addBreadcrumb({ message: 'login', data: { password: 'p' } });
    client.captureMessage('m', 'info', { cardNumber: '4111' });

    const [event] = sent;
    expect(event.user).toEqual({ id: '1', email: '[Filtered]' });
    expect(event.tags.authToken).toBe('[Filtered]');
    expect(event.extra.cardNumber).toBe('[Filtered]');
    expect(event.breadcrumbs[0].data.password).toBe('[Filtered]');
  });

  it('can turn scrubbing off', () => {
    const { client, sent } = setup({ sanitize: false });
    client.captureMessage('m', 'info', { password: 'p' });
    expect(sent[0].extra.password).toBe('p');
  });

  it('lets beforeSend modify or drop events', () => {
    const { client, sent } = setup({
      beforeSend: (event) => (event.level === 'debug' ? null : { ...event, tags: { ...event.tags, edited: true } }),
    });
    client.captureMessage('drop me', 'debug');
    client.captureMessage('keep me');

    expect(sent).toHaveLength(1);
    expect(sent[0].tags.edited).toBe(true);
  });

  it('uses the platform context and survives a failing getContext', () => {
    const ok = setup({}, { getContext: () => ({ url: 'https://app.io' }) });
    ok.client.captureMessage('a');
    expect(ok.sent[0].context.url).toBe('https://app.io');

    const broken = setup({}, { getContext: () => { throw new Error('no window'); } });
    broken.client.captureMessage('b');
    expect(broken.sent[0].context).toHaveProperty('timestamp');
  });

  it('never throws when a transport or beforeSend fails', () => {
    const client = createClient({ beforeSend: () => { throw new Error('bad hook'); } }, [
      { name: 'broken', send: () => { throw new Error('down'); } },
    ]);
    expect(() => client.captureMessage('x')).not.toThrow();
    expect(client.captureMessage('y')).toBeNull();
  });
});
