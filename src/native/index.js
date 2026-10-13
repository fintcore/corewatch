/**
 * CoreWatch — React Native entry point (Expo and bare React Native).
 *
 * Metro picks this file automatically for `import ... from '@dynamicore/corewatch'`
 * (the "react-native" field / export condition), so apps use the same imports as
 * on the web. It is also available as '@dynamicore/corewatch/native'.
 *
 *   import * as CoreWatch from '@dynamicore/corewatch';
 *
 *   CoreWatch.init({
 *     project: 'my-app',
 *     environment: __DEV__ ? 'development' : 'production',
 *     transports: [CoreWatch.createHttpTransport({ baseUrl: API_URL, authorization: () => session.token })],
 *   });
 *
 *   export default CoreWatch.wrap(App);
 */

import { AppState, Platform } from 'react-native';

import { initClient } from '../core/hub.js';
import { createConsoleTransport as createBaseConsoleTransport } from '../transports/consoleTransport.js';
import { createHttpTransport as createBaseHttpTransport } from '../transports/httpTransport.js';
import { installConsoleBreadcrumbs, installFetchBreadcrumbs, installXhrBreadcrumbs } from '../browser/breadcrumbs.js';
import { getNativeContext, setAppInfo } from './context.js';
import { installNativeGlobalHandlers } from './globalHandlers.js';

let appStateSubscription = null;

function installAppStateTracking(client) {
  if (appStateSubscription || !AppState || typeof AppState.addEventListener !== 'function') return;
  let previous = AppState.currentState;
  appStateSubscription = AppState.addEventListener('change', (state) => {
    try {
      if (state === previous) return;
      client.addBreadcrumb({
        category: 'app.lifecycle',
        level: 'info',
        message: `${previous || 'unknown'} → ${state}`,
      });
      previous = state;
      // The OS may suspend or kill a backgrounded app: send what is queued now.
      if (state === 'background') client.flush();
    } catch (_) {
      /* noop */
    }
  });
}

export const nativePlatform = {
  name: 'react-native',
  getContext: getNativeContext,
  defaultTransports: () => [createConsoleTransport()],
  setup(client, config) {
    const integrations = config.integrations || {};
    setAppInfo(config.app);
    if (integrations.globalHandlers !== false) {
      installNativeGlobalHandlers(client, {
        flush: () => client.flush(),
        fatalFlushTimeoutMs: config.fatalFlushTimeoutMs,
      });
    }
    // fetch, XHR and console exist on React Native; DOM clicks and history do not.
    if (integrations.console !== false) installConsoleBreadcrumbs(client);
    if (integrations.fetch !== false) installFetchBreadcrumbs(client);
    if (integrations.xhr !== false) installXhrBreadcrumbs(client);
    if (integrations.appState !== false) installAppStateTracking(client);
  },
};

/**
 * Initialize CoreWatch on React Native. Idempotent.
 * Extra options on top of the web ones:
 *   app: { name, version, build }   — overrides what Expo reports
 *   fatalFlushTimeoutMs             — how long a fatal crash waits to send (default 2000)
 *   integrations.appState           — lifecycle breadcrumbs + flush on background (default true)
 */
export function init(config = {}) {
  return initClient(config, nativePlatform);
}

/** Console transport without browser %c styles (React Native consoles print them as text). */
export function createConsoleTransport(options = {}) {
  return createBaseConsoleTransport({ styled: false, ...options });
}

/**
 * HTTP transport for React Native. Same options as on the web, but there is no
 * localStorage session: pass `authorization` (string or function). `platform`
 * defaults to 'ios' / 'android'.
 */
export function createHttpTransport(options = {}) {
  return createBaseHttpTransport({ platform: Platform.OS, ...options });
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
} from '../core/hub.js';

export { DEFAULT_DENY_KEYS } from '../core/sanitize.js';
export { createReduxEnhancer } from '../integrations/redux.js';
export { default as useCaptureError } from '../react/useCaptureError.js';
export { ErrorBoundary, withErrorBoundary, wrap } from './components.js';
export { registerNavigationContainer } from './navigation.js';
