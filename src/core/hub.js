/**
 * The hub: a module-level client singleton plus the public capture API.
 * Platform-agnostic — each entry point (browser today; React Native / Node
 * later) calls initClient() with its own platform adapter:
 *
 *   {
 *     name: 'browser',
 *     getContext: () => ({ ... }),            // runtime snapshot per event
 *     defaultTransports: () => [transport],   // used when config.transports is omitted
 *     setup: (client, config) => {},          // install handlers / breadcrumbs (once)
 *   }
 */

import { createClient } from './client';

let client = null;

function warnNotInit() {
  /* eslint-disable-next-line no-console */
  if (typeof console !== 'undefined' && console.warn) console.warn('[CoreWatch] called before init(); ignored.');
}

/** Creates the singleton client for a platform. Idempotent — a second call returns the first client. */
export function initClient(config = {}, platform = {}) {
  if (client) return client;

  const transports = config.transports
    || (typeof platform.defaultTransports === 'function' ? platform.defaultTransports() : []);
  client = createClient(config, transports, { getContext: platform.getContext });

  try {
    if (typeof platform.setup === 'function') platform.setup(client, config);
  } catch (err) {
    if (config.debug && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[CoreWatch] platform setup failed', err);
    }
  }

  if (config.debug && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[CoreWatch] initialized', {
      platform: platform.name || 'unknown',
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

/** @internal Test helper: forget the current client. Installed platform hooks are not removed. */
export function _resetClient() {
  client = null;
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
