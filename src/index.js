/**
 * CoreWatch — browser entry point.
 *
 *   import * as CoreWatch from '@dynamicore/corewatch';
 *   CoreWatch.init({ project: 'my-app', environment: 'production' });
 *
 * The capture API lives in core/hub.js and is shared by every platform; this
 * file only wires the browser adapter (context, global handlers, breadcrumbs).
 */

import { initClient } from './core/hub.js';
import { browserPlatform } from './browser/index.js';

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
  flush,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setTag,
  setExtra,
  logger,
} from './core/hub.js';

// Default list of keys scrubbed from events (extend it through `denyKeys`).
export { DEFAULT_DENY_KEYS } from './core/sanitize.js';

// Transports (compose your own list in init).
export { createConsoleTransport } from './transports/consoleTransport.js';
export { createHttpTransport } from './transports/httpTransport.js';

// Redux integration (Sentry.createReduxEnhancer parity).
export { createReduxEnhancer } from './integrations/redux.js';

// React adapter (also available as '@dynamicore/corewatch/react').
export { ErrorBoundary, withErrorBoundary, useCaptureError } from './react/index.js';
