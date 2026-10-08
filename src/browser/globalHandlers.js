/**
 * The two capture surfaces a React hook can't reach:
 *   - window 'error'            → uncaught runtime errors (and resource errors)
 *   - window 'unhandledrejection' → promises rejected without a .catch()
 *
 * Install once, at startup, before the app renders.
 */

let installed = false;

export function installGlobalHandlers(client) {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    try {
      // Resource load errors (img/script/link) have no `error` object.
      if (!event.error && event.target && event.target !== window) {
        const el = event.target;
        client.capture(
          {
            message: `Resource failed to load: ${el.tagName} ${el.src || el.href || ''}`,
            level: 'warning',
            mechanism: 'resource',
          },
          {
            resource: {
              tag: el.tagName,
              url: el.src || el.href || '', 
            }, 
          },
        );
        return;
      }

      client.capture(
        {
          error: event.error || event.message,
          level: 'error',
          mechanism: 'onerror',
        },
        {
          onerror: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
      );
    } catch (_) {
      /* never throw from a global handler */
    }
  }, true); // capture phase so resource errors are seen

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason !== undefined ? event.reason : event;
      client.capture({
        error: reason instanceof Error ? reason : undefined,
        message: reason instanceof Error ? undefined : `Unhandled rejection: ${safeString(reason)}`,
        level: 'error',
        mechanism: 'unhandledrejection',
      });
    } catch (_) {
      /* noop */
    }
  });
}

function safeString(v) {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch (_) {
    return String(v);
  }
}
