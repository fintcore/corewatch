/**
 * CoreWatch — browser entry point.
 *
 *   import * as CoreWatch from '@dynamicore/corewatch';
 *   CoreWatch.init({ project: 'my-app', environment: 'production' });
 *
 * The capture API lives in core/hub.js and is shared by every platform; this
 * file only wires the browser adapter (context, global handlers, breadcrumbs).
 */

import { initClient } from './core/hub';
import { browserPlatform } from './browser';

/**
 * Initialize CoreWatch. Idempotent — a second call is ignored.
 * @param {object} [config] see DEFAULT_CONFIG in core/client.js. Extra keys:
 *   transports: Transport[]   — defaults to [console]
 *   integrations: { globalHandlers, console, fetch, xhr, dom, history }
 */
export function init(config = {}) {
  return initClient(config, browserPlatform);
}

export {
  getClient,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setTag,
  setExtra,
  logger,
} from './core/hub';

// Transports (compose your own list in init).
export { createConsoleTransport } from './transports/consoleTransport';
export { createHttpTransport } from './transports/httpTransport';

// Redux integration (Sentry.createReduxEnhancer parity).
export { createReduxEnhancer } from './integrations/redux';

// React adapter.
export { default as ErrorBoundary } from './react/ErrorBoundary';
export { default as withErrorBoundary } from './react/withErrorBoundary';
export { default as useCaptureError } from './react/useCaptureError';
