/**
 * Redux store enhancer (Sentry.createReduxEnhancer parity).
 *
 *   import { createReduxEnhancer } from 'corewatch';
 *   const enhancers = [middlewareEnhancer, createReduxEnhancer()];
 *   const store = createStore(rootReducer, compose(...enhancers));
 *
 * Records each dispatched action as a breadcrumb and (optionally) attaches the
 * latest state to captured events. State/actions run through the same PII
 * scrubbing as everything else before an event is sent.
 */

import { addBreadcrumb, setExtra } from '../core/hub';

export function createReduxEnhancer(options = {}) {
  const cfg = {
    actionBreadcrumbs: true,
    attachState: true,
    // Hooks to trim/redact before anything is recorded.
    actionTransformer: (action) => action,
    stateTransformer: (state) => state,
    ...options,
  };

  return (next) => (reducer, initialState) => {
    function enhancedReducer(state, action) {
      const newState = reducer(state, action);

      try {
        if (cfg.actionBreadcrumbs && action && action.type) {
          const transformed = cfg.actionTransformer(action);
          addBreadcrumb({
            category: 'redux.action',
            level: 'info',
            message: String(action.type),
            data: transformed || undefined,
          });
        }

        if (cfg.attachState) {
          const transformed = cfg.stateTransformer(newState);
          if (transformed !== undefined) setExtra('redux.state', transformed);
        }
      } catch (_) {
        /* never break the reducer chain */
      }

      return newState;
    }

    return next(enhancedReducer, initialState);
  };
}
