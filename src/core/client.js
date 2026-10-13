/**
 * The client owns config, scope and transports, and turns raw captures into
 * processed events. Everything here is defensive: the tracker must never throw
 * into the host app.
 */

import { createScope } from './scope.js';
import { createDeduper } from './dedupe.js';
import { buildEvent } from './event.js';
import { sanitize, DEFAULT_DENY_KEYS } from './sanitize.js';
import { SDK } from './sdk.js';

export const DEFAULT_CONFIG = {
  enabled: true,
  debug: false,
  environment: 'development',
  release: null,
  project: null, // repo/app slug (e.g. 'core-panel'); one project can serve several companies
  maxBreadcrumbs: 50,
  sampleRate: 1.0, // 0..1 — fraction of events to keep
  ignoreErrors: [], // strings or RegExp matched against the message
  denyKeys: DEFAULT_DENY_KEYS, // extra PII keys can be appended
  sanitize: true,
  beforeSend: null, // (event) => event | null   (return null to drop)
};

function matchesIgnore(message, patterns) {
  if (!message || !patterns || !patterns.length) return false;
  return patterns.some((p) => {
    try {
      return p instanceof RegExp ? p.test(message) : message.indexOf(p) !== -1;
    } catch (_) {
      return false;
    }
  });
}

/** Minimal context when no platform adapter provides one. */
function defaultContext() {
  return { sdk: SDK, timestamp: new Date().toISOString() };
}

/**
 * @param {object} userConfig
 * @param {Array}  transports
 * @param {object} [options]
 * @param {() => object} [options.getContext]  platform runtime context (browser, React Native, Node...)
 */
export function createClient(userConfig, transports, options = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...(userConfig || {}), 
  };
  const scope = createScope(config.maxBreadcrumbs);
  const deduper = createDeduper();
  const activeTransports = transports || [];
  const getContext = typeof options.getContext === 'function' ? options.getContext : defaultContext;

  function runtimeContext() {
    try {
      return getContext();
    } catch (_) {
      return defaultContext();
    }
  }

  if (userConfig && userConfig.user) scope.setUser(userConfig.user);

  function log(...args) {
    if (config.debug && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[CoreWatch]', ...args);
    }
  }

  function dispatch(event) {
    for (const t of activeTransports) {
      try {
        t.send(event);
      } catch (err) {
        log('transport failed', t && t.name, err);
      }
    }
  }

  function process(raw, extraContext) {
    if (!config.enabled) return null;

    try {
      let event = buildEvent(raw, config, scope.snapshot(), extraContext, runtimeContext());

      if (matchesIgnore(event.message, config.ignoreErrors)) {
        log('ignored by ignoreErrors', event.message);
        return null;
      }

      if (deduper.isDuplicate(event)) {
        log('dropped duplicate', event.message);
        return null;
      }

      if (config.sampleRate < 1 && Math.random() > config.sampleRate) {
        log('dropped by sampleRate');
        return null;
      }

      if (config.sanitize) {
        event.user = sanitize(event.user, config.denyKeys);
        event.extra = sanitize(event.extra, config.denyKeys);
        event.tags = sanitize(event.tags, config.denyKeys);
        event.breadcrumbs = sanitize(event.breadcrumbs, config.denyKeys);
      }

      if (typeof config.beforeSend === 'function') {
        event = config.beforeSend(event);
        if (!event) {
          log('dropped by beforeSend');
          return null;
        }
      }

      dispatch(event);
      return event.eventId;
    } catch (err) {
      log('process() failed', err);
      return null;
    }
  }

  return {
    config,
    getScope: () => scope,

    captureException(error, extraContext) {
      // `mechanism` describes how the error was caught; it is not extra data.
      const { mechanism = 'manual', ...extra } = extraContext || {};
      return process({
        error,
        level: 'error',
        mechanism,
      }, extra);
    },

    captureMessage(message, level = 'info', extraContext) {
      return process({
        message,
        level,
        mechanism: 'manual', 
      }, extraContext);
    },

    // Low-level: integrations call this with a pre-shaped raw capture.
    capture(raw, extraContext) {
      return process(raw, extraContext);
    },

    /**
     * Asks every transport to send what it has queued right away. Resolves when
     * the transports report they are done (never rejects). Used before the app
     * goes to the background or crashes.
     */
    flush() {
      const pending = activeTransports.map((t) => {
        try {
          return t && typeof t.flush === 'function' ? t.flush(true) : undefined;
        } catch (err) {
          log('transport flush failed', t && t.name, err);
          return undefined;
        }
      });
      return Promise.all(pending).then(() => undefined, () => undefined);
    },

    addBreadcrumb: (crumb) => scope.addBreadcrumb(crumb),
    setUser: (u) => scope.setUser(u),
    setTag: (k, v) => scope.setTag(k, v),
    setExtra: (k, v) => scope.setExtra(k, v),
  };
}
