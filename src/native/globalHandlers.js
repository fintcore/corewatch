/**
 * React Native capture surfaces a component can't reach:
 *   - ErrorUtils global handler → uncaught JS errors (isFatal = the app is about to crash)
 *   - promise rejection tracker → promises rejected without a .catch()
 *
 * Both chain whatever React Native had installed (red box / LogBox in dev,
 * crash reporting in release) instead of replacing it.
 */

let installed = false;

const DEFAULT_FATAL_FLUSH_MS = 2000;

const getErrorUtils = () => (typeof ErrorUtils !== 'undefined' ? ErrorUtils : global.ErrorUtils);

/**
 * @param {object} client
 * @param {object} options
 * @param {() => Promise<void>} options.flush       sends queued events (best effort)
 * @param {number} [options.fatalFlushTimeoutMs]   how long a fatal crash waits for delivery
 */
export function installNativeGlobalHandlers(client, { flush, fatalFlushTimeoutMs = DEFAULT_FATAL_FLUSH_MS } = {}) {
  if (installed) return;
  installed = true;
  installErrorHandler(client, flush, fatalFlushTimeoutMs);
  installRejectionTracker(client);
}

function installErrorHandler(client, flush, timeoutMs) {
  const errorUtils = getErrorUtils();
  if (!errorUtils || typeof errorUtils.setGlobalHandler !== 'function') return;

  const previous = typeof errorUtils.getGlobalHandler === 'function' ? errorUtils.getGlobalHandler() : null;
  let handlingFatal = false;

  errorUtils.setGlobalHandler((error, isFatal) => {
    try {
      client.capture(
        {
          error,
          level: isFatal ? 'fatal' : 'error',
          mechanism: 'onerror',
        },
        { handled: false, isFatal: Boolean(isFatal) },
      );
    } catch (_) {
      /* never break React Native's own handling */
    }

    if (!isFatal || handlingFatal || typeof previous !== 'function') {
      if (typeof previous === 'function') previous(error, isFatal);
      return;
    }

    // A fatal error ends the app right after the previous handler runs: give the
    // transports a moment to send the event first (bounded by `timeoutMs`).
    handlingFatal = true;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      previous(error, isFatal);
    };
    setTimeout(finish, timeoutMs);
    try {
      Promise.resolve(flush ? flush() : undefined).then(finish, finish);
    } catch (_) {
      finish();
    }
  });
}

function reportRejection(client, reason) {
  try {
    client.capture(
      {
        error: reason,
        level: 'error',
        mechanism: 'unhandledrejection',
      },
      { handled: false },
    );
  } catch (_) {
    /* noop */
  }
}

function installRejectionTracker(client) {
  const onUnhandled = (id, reason) => {
    reportRejection(client, reason);
    // The tracker replaces React Native's own one, which shows the LogBox warning in dev.
    // eslint-disable-next-line no-undef
    if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof console !== 'undefined' && console.warn) {
      // eslint-disable-next-line no-console
      console.warn(`Possible unhandled promise rejection (id: ${id}):`, reason);
    }
  };

  // Hermes (default engine since Expo SDK 48 / React Native 0.70).
  try {
    const hermes = typeof HermesInternal !== 'undefined' ? HermesInternal : null;
    if (hermes && typeof hermes.enablePromiseRejectionTracker === 'function'
      && (typeof hermes.hasPromise !== 'function' || hermes.hasPromise())) {
      hermes.enablePromiseRejectionTracker({ allRejections: true, onUnhandled });
      return;
    }
  } catch (_) {
    /* fall back to the promise polyfill tracker */
  }

  // JavaScriptCore: React Native's Promise comes from the `promise` package.
  try {
    // eslint-disable-next-line global-require
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({ allRejections: true, onUnhandled });
  } catch (_) {
    /* no tracker available */
  }
}

/** @internal Test helper. */
export function _resetNativeGlobalHandlers() {
  installed = false;
}
