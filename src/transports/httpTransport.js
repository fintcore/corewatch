/**
 * HTTP transport: persists each event through the DynamiCore CRUD
 * API: `POST {baseUrl}/private/thirds/corewatch_events`.
 *
 *   transports: [createConsoleTransport(), createHttpTransport({ baseUrl: API_URL, context: API_CONTEXT })]
 *
 * Headers follow the DynamiCore apps' axios setup:
 *   Authorization: <accessToken>   (raw token, no "Bearer")
 *   context: <API context>         (only when the app has one)
 *
 * Reliability: events are queued, sent one POST per event, retried with
 * backoff on network/5xx errors, held while there is no session token, and
 * flushed with `keepalive` when the page is hidden/unloaded. Never throws.
 */

const DEFAULTS = {
  baseUrl: 'https://front.dynamicore.io',
  path: '/private/thirds/corewatch_events',
  url: null, // full endpoint; overrides baseUrl + path
  authorization: null, // string | () => string. Default: read the session token from localStorage
  context: null, // string | () => string. Sent as the `context` header when present
  platform: 'web',
  company: null, // number | () => number. Only used by the API when there is no user session
  client: null, // number | () => number
  flushIntervalMs: 2000,
  maxQueue: 100, // oldest events are dropped beyond this
  maxRetries: 3,
  retryBaseMs: 1000,
  debug: false,
};

const COGNITO_LAST_USER_RE = /^CognitoIdentityServiceProvider\.[^.]+\.LastAuthUser$/;

function resolve(value) {
  try {
    return typeof value === 'function' ? value() : value;
  } catch (_) {
    return null;
  }
}

/**
 * Same token the apps put in Authorization:
 *   - core-panel-v2: localStorage.accessToken
 *   - core-panel (Amplify/Cognito): CognitoIdentityServiceProvider.<clientId>.<user>.accessToken
 */
export function getSessionAuthorization() {
  try {
    if (typeof localStorage === 'undefined') return null;

    const direct = localStorage.getItem('accessToken');
    if (direct) return direct;

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && COGNITO_LAST_USER_RE.test(key)) {
        const user = localStorage.getItem(key);
        const prefix = key.slice(0, -'LastAuthUser'.length);
        const token = user && localStorage.getItem(`${prefix}${user}.accessToken`);
        if (token) return token;
      }
    }
  } catch (_) {
    /* storage blocked (private mode, sandboxed iframe...) */
  }
  return null;
}

/** Flattens a CoreWatch event into the CRUD payload (payloadVar names of the map). */
export function toCrudPayload(event, cfg) {
  const ex = event.exception || {};
  const ctx = event.context || {};
  const payload = {
    event_id: event.eventId,
    level: event.level,
    message: event.message,
    exception_type: ex.type,
    exception_value: ex.value,
    stacktrace: ex.stack && ex.stack.length ? ex.stack : undefined,
    mechanism: event.mechanism,
    project: event.project,
    platform: cfg.platform,
    release: event.release,
    environment: event.environment,
    url: ctx.url,
    context: ctx,
    user_data: event.user,
    tags: event.tags,
    extra: event.extra,
    breadcrumbs: event.breadcrumbs,
    sdk_name: event.sdk && event.sdk.name,
    sdk_version: event.sdk && event.sdk.version,
    occurred_at: ctx.timestamp,
    client: resolve(cfg.client),
    company: resolve(cfg.company),
  };

  // Empty values are left out so the API applies its "" defaults.
  Object.keys(payload).forEach((key) => {
    const v = payload[key];
    if (v === undefined || v === null || v === '') delete payload[key];
    else if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) delete payload[key];
  });

  return payload;
}

export function createHttpTransport(options = {}) {
  const cfg = {
    ...DEFAULTS,
    ...options,
  };
  const endpoint = cfg.url || `${String(cfg.baseUrl || '').replace(/\/+$/, '')}${cfg.path}`;

  // Keep the native fetch: the breadcrumbs integration patches window.fetch after this runs.
  const nativeFetch = typeof fetch === 'function' ? fetch.bind(typeof window !== 'undefined' ? window : undefined) : null;

  const queue = []; // { payload, attempts }
  let timer = null;
  let sending = false;

  function log(...args) {
    if (cfg.debug && typeof console !== 'undefined') {
      // console.log is not patched by the breadcrumbs integration.
      // eslint-disable-next-line no-console
      console.log('[CoreWatch:http]', ...args);
    }
  }

  function headers() {
    const out = { 'Content-Type': 'application/json' };
    const authorization = cfg.authorization != null ? resolve(cfg.authorization) : getSessionAuthorization();
    const context = resolve(cfg.context);

    if (authorization) out.Authorization = String(authorization);
    if (context) out.context = String(context);
    return out;
  }

  function schedule(delay = cfg.flushIntervalMs) {
    if (timer || typeof setTimeout === 'undefined') return;
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, delay);
  }

  function post(item, keepalive) {
    return nativeFetch(endpoint, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(item.payload),
      keepalive: !!keepalive,
      credentials: 'omit',
    }).then((res) => {
      if (res.ok) return 'ok';
      // 4xx other than auth/rate limit will never succeed: drop.
      if (res.status === 401 || res.status === 403 || res.status === 408 || res.status === 429 || res.status >= 500) return 'retry';
      return 'drop';
    }, () => 'retry');
  }

  /**
   * Sends queued events one by one.
   * @param {boolean} [keepalive] page is going away: fire everything without waiting.
   */
  function flush(keepalive = false) {
    if (!nativeFetch || !queue.length) return;

    // Private endpoint: without a session token the POST would only 401. Hold events until login.
    if (!headers().Authorization) {
      log('no session token yet; holding', queue.length, 'event(s)');
      if (!keepalive) schedule();
      return;
    }

    if (keepalive) {
      queue.splice(0, queue.length).forEach((item) => {
        try {
          post(item, true);
        } catch (_) {
          /* noop */
        }
      });
      return;
    }

    if (sending) return;
    sending = true;

    const item = queue[0];
    let result;
    try {
      result = post(item, false);
    } catch (err) {
      result = Promise.resolve('retry');
    }

    result.then((status) => {
      sending = false;
      if (status === 'ok' || status === 'drop') {
        queue.shift();
        if (status === 'drop') log('dropped by API', item.payload.event_id);
        if (queue.length) flush();
        return;
      }

      item.attempts += 1;
      if (item.attempts > cfg.maxRetries) {
        queue.shift();
        log('gave up after retries', item.payload.event_id);
        if (queue.length) flush();
        return;
      }
      schedule(cfg.retryBaseMs * 2 ** (item.attempts - 1));
    });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', () => flush(true));
    if (typeof document !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush(true);
      });
    }
  }

  return {
    name: 'http',
    send(event) {
      if (!nativeFetch) return;
      queue.push({
        payload: toCrudPayload(event, cfg),
        attempts: 0,
      });
      while (queue.length > cfg.maxQueue) queue.shift();
      schedule();
    },
    flush,
  };
}
