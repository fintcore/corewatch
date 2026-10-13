/**
 * Auto-breadcrumbs: the trail of events that happened before an error.
 * Each installer monkey-patches a browser API defensively and records a
 * breadcrumb. Breadcrumbs never become events themselves, so there's no
 * capture loop.
 */

const flags = {
  console: false,
  fetch: false,
  xhr: false,
  dom: false,
  history: false,
};

/* ------------------------------------------------------------------ console */
export function installConsoleBreadcrumbs(client) {
  if (flags.console || typeof console === 'undefined') return;
  flags.console = true;

  /* eslint-disable no-console */
  ['warn', 'error'].forEach((level) => {
    const original = console[level];
    if (typeof original !== 'function') return;
    console[level] = function patched(...args) {
      try {
        client.addBreadcrumb({
          category: 'console',
          level: level === 'warn' ? 'warning' : 'error',
          message: args
            .map((a) => (typeof a === 'string' ? a : safeString(a)))
            .join(' ')
            .slice(0, 500),
        });
      } catch (_) {
        /* noop */
      }
      return original.apply(this, args);
    };
  });
  /* eslint-enable no-console */
}

/* -------------------------------------------------------------------- fetch */
export function installFetchBreadcrumbs(client) {
  if (flags.fetch || typeof window === 'undefined' || !window.fetch) return;
  flags.fetch = true;

  const original = window.fetch;
  window.fetch = function patched(input, init) {
    const method = (init && init.method) || (input && input.method) || 'GET';
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const start = Date.now();

    return original.apply(this, arguments).then(
      (res) => {
        record(client, method, url, res.status, Date.now() - start);
        return res;
      },
      (err) => {
        record(client, method, url, 0, Date.now() - start, true);
        throw err;
      },
    );
  };
}

/* ---------------------------------------------------------------------- xhr */
export function installXhrBreadcrumbs(client) {
  if (flags.xhr || typeof XMLHttpRequest === 'undefined') return;
  flags.xhr = true;

  const proto = XMLHttpRequest.prototype;
  const { open } = proto;
  const { send } = proto;

  proto.open = function patchedOpen(method, url) {
    this.__et = {
      method,
      url,
      start: 0, 
    };
    return open.apply(this, arguments);
  };

  proto.send = function patchedSend() {
    const meta = this.__et;
    if (meta) {
      meta.start = Date.now();
      this.addEventListener('loadend', () => {
        record(client, meta.method, meta.url, this.status, Date.now() - meta.start, this.status === 0);
      });
    }
    return send.apply(this, arguments);
  };
}

function record(client, method, url, status, durationMs, failed) {
  try {
    client.addBreadcrumb({
      category: 'http',
      level: failed || status >= 500 ? 'error' : status >= 400 ? 'warning' : 'info',
      message: `${String(method).toUpperCase()} ${url} → ${failed ? 'failed' : status}`,
      data: {
        method,
        url,
        status,
        durationMs, 
      },
    });
  } catch (_) {
    /* noop */
  }
}

/* ---------------------------------------------------------------------- dom */
export function installDomBreadcrumbs(client) {
  if (flags.dom || typeof document === 'undefined') return;
  flags.dom = true;

  document.addEventListener(
    'click',
    (e) => {
      try {
        client.addBreadcrumb({
          category: 'ui.click',
          level: 'info',
          message: describeElement(e.target),
        });
      } catch (_) {
        /* noop */
      }
    },
    true,
  );
}

function describeElement(el) {
  if (!el || !el.tagName) return 'unknown';
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = el.className && typeof el.className === 'string'
    ? `.${ el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
    : '';
  const text = (el.innerText || el.textContent || '').trim().slice(0, 40);
  return `${tag}${id}${cls}${text ? ` "${text}"` : ''}`;
}

/* ------------------------------------------------------------------ history */
export function installHistoryBreadcrumbs(client) {
  if (flags.history || typeof window === 'undefined' || !window.history) return;
  flags.history = true;

  const push = window.history.pushState;
  const replace = window.history.replaceState;

  function crumb(to) {
    try {
      client.addBreadcrumb({
        category: 'navigation',
        level: 'info',
        message: `→ ${to}`,
        data: {
          to, 
        },
      });
    } catch (_) {
      /* noop */
    }
  }

  if (typeof push === 'function') {
    window.history.pushState = function patched(state, title, url) {
      if (url) crumb(String(url));
      return push.apply(this, arguments);
    };
  }
  if (typeof replace === 'function') {
    window.history.replaceState = function patched(state, title, url) {
      if (url) crumb(String(url));
      return replace.apply(this, arguments);
    };
  }
  window.addEventListener('popstate', () => crumb(window.location ? window.location.href : ''));
}

function safeString(v) {
  try {
    if (typeof v === 'string') return v;
    // JSON.stringify(new Error('x')) is "{}": keep what identifies the error.
    if (v instanceof Error) return `${v.name || 'Error'}: ${v.message}`;
    return JSON.stringify(v);
  } catch (_) {
    return String(v);
  }
}

/** Install all enabled breadcrumb integrations. */
export function installBreadcrumbs(client, opts = {}) {
  if (opts.console !== false) installConsoleBreadcrumbs(client);
  if (opts.fetch !== false) installFetchBreadcrumbs(client);
  if (opts.xhr !== false) installXhrBreadcrumbs(client);
  if (opts.dom !== false) installDomBreadcrumbs(client);
  if (opts.history !== false) installHistoryBreadcrumbs(client);
}
