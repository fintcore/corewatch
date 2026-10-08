import { afterEach, describe, expect, it } from 'vitest';
import * as hub from '../src/core/hub.js';
import { createReduxEnhancer } from '../src/integrations/redux.js';

afterEach(() => hub._resetClient());

// Minimal createStore so the test does not depend on redux.
function createStore(reducer, initialState, enhancer) {
  if (enhancer) return enhancer(createStore)(reducer, initialState);
  let state = initialState;
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action);
      return action;
    },
  };
}

const counter = (state = { count: 0, token: 'secret' }, action) => (
  action.type === 'inc' ? { ...state, count: state.count + 1 } : state
);

function init(config) {
  const sent = [];
  hub.initClient({ transports: [{ name: 'memory', send: (e) => sent.push(e) }], ...config });
  return sent;
}

describe('createReduxEnhancer', () => {
  it('records actions as breadcrumbs and attaches the latest state', () => {
    const sent = init();
    const store = createStore(counter, undefined, createReduxEnhancer());
    store.dispatch({ type: 'inc' });
    store.dispatch({ type: 'inc' });
    hub.captureMessage('after');

    const [event] = sent;
    expect(event.breadcrumbs.filter((c) => c.category === 'redux.action').map((c) => c.message)).toEqual(['inc', 'inc']);
    expect(event.extra['redux.state']).toEqual({ count: 2, token: '[Filtered]' });
  });

  it('supports transformers and opting out', () => {
    const sent = init();
    const store = createStore(counter, undefined, createReduxEnhancer({
      actionBreadcrumbs: false,
      stateTransformer: (state) => ({ count: state.count }),
    }));
    store.dispatch({ type: 'inc' });
    hub.captureMessage('after');

    expect(sent[0].breadcrumbs).toHaveLength(0);
    expect(sent[0].extra['redux.state']).toEqual({ count: 1 });
  });

  it('never breaks the reducer when a transformer throws', () => {
    init();
    const store = createStore(counter, undefined, createReduxEnhancer({
      actionTransformer: () => { throw new Error('bad transformer'); },
    }));
    expect(() => store.dispatch({ type: 'inc' })).not.toThrow();
    expect(store.getState().count).toBe(1);
  });
});
