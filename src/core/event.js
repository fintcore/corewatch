/**
 * Builds the normalized event payload. This shape is the contract the console
 * transport prints today and the HTTP transport / backend will consume later,
 * so keep it stable.
 */

import { SDK } from './sdk.js';
import { normalizeError } from './stacktrace.js';

let counter = 0;

// Same slug the CRUD stores: 'Core Panel' -> 'core-panel'.
function normalizeProject(project) {
  if (typeof project !== 'string') return null;
  const slug = project.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return slug || null;
}

function makeEventId() {
  // Not crypto-strong; enough to correlate a browser event with a server row.
  const rand = Math.random().toString(16).slice(2);
  const time = Date.now().toString(16);
  counter = (counter + 1) % 0xffff;
  return `${time}${rand}${counter.toString(16)}`.slice(0, 32).padEnd(32, '0');
}

/**
 * @param {object} params
 * @param {Error|*} [params.error]     thrown value (for exceptions)
 * @param {string} [params.message]    message (for captureMessage)
 * @param {string} [params.level]      'fatal'|'error'|'warning'|'info'|'debug'
 * @param {string} [params.mechanism]  how it was captured (onerror, react, manual...)
 * @param {object} config              active client config
 * @param {object} scopeSnapshot       user/tags/extra/breadcrumbs
 * @param {object} [extraContext]      integration-specific extras (e.g. componentStack)
 * @param {object} [runtimeContext]    platform snapshot (url, UA, device...) from the platform adapter
 */
export function buildEvent({ error, message, level, mechanism }, config, scopeSnapshot, extraContext, runtimeContext) {
  const event = {
    eventId: makeEventId(),
    level: level || (error ? 'error' : 'info'),
    message: message || null,
    exception: null,
    mechanism: mechanism || 'manual',

    // project / release / environment let the backend group by app and deploy.
    project: normalizeProject(config.project),
    release: config.release || null,
    environment: config.environment || null,

    context: runtimeContext || { sdk: SDK, timestamp: new Date().toISOString() },
    user: scopeSnapshot.user,
    tags: scopeSnapshot.tags,
    extra: {
      ...scopeSnapshot.extra,
      ...(extraContext || {}), 
    },
    breadcrumbs: scopeSnapshot.breadcrumbs,

    sdk: SDK,
  };

  if (error !== undefined && error !== null) {
    event.exception = normalizeError(error);
    if (!event.message) event.message = `${event.exception.type}: ${event.exception.value}`;
  }

  return event;
}
