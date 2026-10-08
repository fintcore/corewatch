/**
 * CoreWatch — Sentry-like client-side error capture for React apps.
 *
 * Usage (namespace, Sentry-style):
 *   import * as CoreWatch from 'corewatch';
 *   CoreWatch.init({ dsn, environment, release });
 *   <CoreWatch.ErrorBoundary> ... </CoreWatch.ErrorBoundary>
 *
 * Or named imports:
 *   import { init, captureException, ErrorBoundary } from 'corewatch';
 *
 * Phase 1 sends everything to the browser console only — no data leaves the
 * browser. Phase 2: add createHttpTransport() to persist to your API.
 */

import { createClient } from './core/client';
import { createConsoleTransport } from './transports/consoleTransport';
import { createHttpTransport } from './transports/httpTransport';
import { installGlobalHandlers } from './browser/globalHandlers';
import { installBreadcrumbs } from './browser/breadcrumbs';
import { getRuntimeContext } from './browser/context';

let client = null; // module-level singleton (the "hub")

function warnNotInit() {
  /* eslint-disable-next-line no-console */
  if (typeof console !== 'undefined' && console.warn) console.warn('[CoreWatch] called before init(); ignored.');
}

/**
 * Initialize CoreWatch. Idempotent — a second call is ignored.
 * @param {object} [config] see DEFAULT_CONFIG in core/client.js. Extra keys:
 *   transports: Transport[]   — defaults to [console]
 *   integrations: { globalHandlers, console, fetch, xhr, dom, history }
 */
export function init(config = {}) {
  if (client) return client;

  const transports = config.transports || [createConsoleTransport()];
  client = createClient(config, transports, { getContext: getRuntimeContext });

  const integrations = config.integrations || {};
  if (integrations.globalHandlers !== false) installGlobalHandlers(client);
  installBreadcrumbs(client, integrations);

  if (config.debug && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[CoreWatch] initialized', {
      project: client.config.project,
      environment: client.config.environment,
      release: client.config.release,
      transports: transports.map((t) => t.name),
    });
  }

  return client;
}

export function getClient() {
  return client;
}

export function captureException(error, extra) {
  if (!client) return warnNotInit();
  return client.captureException(error, extra);
}

export function captureMessage(message, level, extra) {
  if (!client) return warnNotInit();
  return client.captureMessage(message, level, extra);
}

export function addBreadcrumb(crumb) {
  if (!client) return warnNotInit();
  return client.addBreadcrumb(crumb);
}

export function setUser(user) {
  if (!client) return warnNotInit();
  return client.setUser(user);
}

export function setTag(key, value) {
  if (!client) return warnNotInit();
  return client.setTag(key, value);
}

export function setExtra(key, value) {
  if (!client) return warnNotInit();
  return client.setExtra(key, value);
}

/** Structured logging helpers (Sentry.logger parity). */
export const logger = {
  fatal: (message, extra) => captureMessage(message, 'fatal', extra),
  error: (message, extra) => captureMessage(message, 'error', extra),
  warn: (message, extra) => captureMessage(message, 'warning', extra),
  info: (message, extra) => captureMessage(message, 'info', extra),
  debug: (message, extra) => captureMessage(message, 'debug', extra),
};

// Transports (compose your own list in init).
export { createConsoleTransport, createHttpTransport };

// Redux integration (Sentry.createReduxEnhancer parity).
export { createReduxEnhancer } from './integrations/redux';

// React adapter.
export { default as ErrorBoundary } from './react/ErrorBoundary';
export { default as withErrorBoundary } from './react/withErrorBoundary';
export { default as useCaptureError } from './react/useCaptureError';
