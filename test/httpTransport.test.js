import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpTransport, getSessionAuthorization, toCrudPayload } from '../src/transports/httpTransport.js';
import { buildEvent } from '../src/core/event.js';

const scope = { user: { id: 'u1' }, tags: {}, extra: {}, breadcrumbs: [] };
const makeEvent = (message = 'boom') => buildEvent(
  { error: new Error(message), mechanism: 'onerror' },
  { project: 'core-panel', release: '1.0.0', environment: 'production' },
  scope,
  undefined,
  { url: 'https://app.io/dashboard', timestamp: '2026-10-02T23:04:17.903Z' },
);

function memoryStorage(entries) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
  };
}

describe('toCrudPayload', () => {
  it('flattens the event into the CRUD payload and drops empty values', () => {
    const payload = toCrudPayload(makeEvent(), { platform: 'web', company: () => 4174, client: null });

    expect(payload).toMatchObject({
      level: 'error',
      exception_type: 'Error',
      exception_value: 'boom',
      mechanism: 'onerror',
      project: 'core-panel',
      platform: 'web',
      release: '1.0.0',
      environment: 'production',
      url: 'https://app.io/dashboard',
      occurred_at: '2026-10-02T23:04:17.903Z',
      user_data: { id: 'u1' },
      sdk_name: 'corewatch',
      company: 4174,
    });
    expect(payload.event_id).toHaveLength(32);
    expect(payload).not.toHaveProperty('client');
    expect(payload).not.toHaveProperty('tags');
  });
});

describe('getSessionAuthorization', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads localStorage.accessToken first', () => {
    vi.stubGlobal('localStorage', memoryStorage({ accessToken: 'v2-token' }));
    expect(getSessionAuthorization()).toBe('v2-token');
  });

  it('falls back to the Amplify/Cognito keys', () => {
    vi.stubGlobal('localStorage', memoryStorage({
      'CognitoIdentityServiceProvider.abc.LastAuthUser': 'ana',
      'CognitoIdentityServiceProvider.abc.ana.accessToken': 'cognito-token',
    }));
    expect(getSessionAuthorization()).toBe('cognito-token');
  });

  it('returns null without storage', () => {
    expect(getSessionAuthorization()).toBeNull();
  });
});

describe('createHttpTransport', () => {
  let fetchMock;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts each event with the auth and context headers', async () => {
    const transport = createHttpTransport({ baseUrl: 'https://api.test/', authorization: 'tkn', context: 'ctx' });
    transport.send(makeEvent());
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/private/thirds/corewatch_events');
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', keepalive: false });
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'tkn', context: 'ctx' });
    expect(JSON.parse(init.body).project).toBe('core-panel');
  });

  it('holds events until there is a session token', async () => {
    let token = null;
    const transport = createHttpTransport({ authorization: () => token });
    transport.send(makeEvent());
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetchMock).not.toHaveBeenCalled();

    token = 'late-login';
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('retries with backoff on 5xx and gives up after maxRetries', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const transport = createHttpTransport({ authorization: 't', maxRetries: 2, retryBaseMs: 100 });
    transport.send(makeEvent());

    await vi.advanceTimersByTimeAsync(2000); // first attempt
    await vi.advanceTimersByTimeAsync(100); // retry 1
    await vi.advanceTimersByTimeAsync(200); // retry 2
    await vi.advanceTimersByTimeAsync(10000);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('drops events the API rejects with a non-retryable 4xx', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 }).mockResolvedValue({ ok: true, status: 200 });
    const transport = createHttpTransport({ authorization: 't' });
    transport.send(makeEvent('first'));
    transport.send(makeEvent('second'));
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).exception_value).toBe('second');
  });

  it('keeps only the newest maxQueue events', async () => {
    const transport = createHttpTransport({ authorization: 't', maxQueue: 2 });
    ['a', 'b', 'c'].forEach((m) => transport.send(makeEvent(m)));
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).exception_value)).toEqual(['b', 'c']);
  });

  it('flushes everything with keepalive when the page goes away', () => {
    const transport = createHttpTransport({ authorization: 't' });
    transport.send(makeEvent('a'));
    transport.send(makeEvent('b'));
    transport.flush(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([, init]) => init.keepalive)).toBe(true);
  });
});
