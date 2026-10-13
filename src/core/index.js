/**
 * Platform-agnostic core: `import { initClient } from '@dynamicore/corewatch/core'`.
 *
 * For building platform adapters (React Native, Node, workers...). Nothing here
 * touches window, document or navigator.
 */

export {
  initClient,
  getClient,
  flush,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setTag,
  setExtra,
  logger,
} from './hub.js';
export { createClient, DEFAULT_CONFIG } from './client.js';
export { buildEvent } from './event.js';
export { sanitize, DEFAULT_DENY_KEYS } from './sanitize.js';
export { parseStack, normalizeError } from './stacktrace.js';
export { SDK } from './sdk.js';
