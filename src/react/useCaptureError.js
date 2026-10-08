/**
 * Ergonomic manual capture from function components. Handles the two cases a
 * hook is actually good for:
 *   - report an error you caught in an event handler / async code
 *   - wrap an async fn so a rejection is reported and re-thrown
 *
 * (Render errors are handled by <ErrorBoundary>, not here — a hook can't catch
 * those.)
 */

import { useCallback } from 'react';

import {
  captureException, captureMessage, addBreadcrumb, 
} from '../index';

export default function useCaptureError() {
  const capture = useCallback((error, extra) => captureException(error, extra), []);

  const captureMsg = useCallback(
    (message, level = 'info', extra) => captureMessage(message, level, extra),
    [],
  );

  const wrapAsync = useCallback(
    (fn, extra) => async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        captureException(error, {
          mechanism: 'hook.wrapAsync',
          ...(extra || {}), 
        });
        throw error;
      }
    },
    [],
  );

  return {
    captureException: capture,
    captureMessage: captureMsg,
    addBreadcrumb,
    wrapAsync,
  };
}
