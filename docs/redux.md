# Redux

`createReduxEnhancer()` records every dispatched action as a breadcrumb and attaches the latest state to captured events, so you can see what the user did right before an error.

```js
import { createStore, applyMiddleware, compose } from 'redux';
import { createReduxEnhancer } from '@dynamicore/corewatch';

const store = createStore(
  rootReducer,
  compose(applyMiddleware(thunk), createReduxEnhancer()),
);
```

With Redux Toolkit:

```js
import { configureStore } from '@reduxjs/toolkit';
import { createReduxEnhancer } from '@dynamicore/corewatch';

const store = configureStore({
  reducer,
  enhancers: (getDefaultEnhancers) => getDefaultEnhancers().concat(createReduxEnhancer()),
});
```

> Initialize CoreWatch **before** creating the store (import your `instrument.js` first). Actions dispatched before `init()` are ignored with a console warning.

## Options

| Option | Default | Description |
|---|---|---|
| `actionBreadcrumbs` | `true` | Record each action as a `redux.action` breadcrumb. |
| `attachState` | `true` | Store the latest state in `event.extra['redux.state']`. |
| `actionTransformer` | identity | Edit or redact the action before it is recorded. |
| `stateTransformer` | identity | Edit or redact the state. Return `undefined` to skip it. |

## Keep events small

The whole state is captured by default. Large stores make events heavy, and events sent while the page is closing are limited to about 64 KB by the browser. Keep only what helps debugging:

```js
createReduxEnhancer({
  stateTransformer: (state) => ({
    route: state.router.location.pathname,
    user: { role: state.session.role },
    cart: { items: state.cart.items.length },
  }),
  actionTransformer: (action) => (action.type === 'auth/login' ? { type: action.type } : action),
});
```

State and actions also go through the [privacy scrubbing](./privacy.md) when an event is captured.
