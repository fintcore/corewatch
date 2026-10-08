# CoreWatch

Sentry-like client-side error capture for React apps. Framework-agnostic core +
React adapter. **Phase 1** logs everything to the browser console — nothing
leaves the browser. **Phase 2** adds an HTTP transport to persist to your API.

## Install

Local (monorepo-style, sibling folders under `DynamiCore/`):

```jsonc
// consumer package.json
"dependencies": {
  "corewatch": "file:../corewatch"
}
```

Then in the consumer app:

```bash
npm install
```

> The package ships a **built `dist/`** (Babel, same browserslist as the apps),
> because Create React App does not transpile `node_modules`. After changing the
> source, rebuild: `npm run build` inside `corewatch/`.

## Setup (Sentry-style)

Create an `instrument.js` and import it **first** in your entry point:

```js
// src/instrument.js
import * as CoreWatch from 'corewatch';

CoreWatch.init({
  // dsn: 'https://key@ingest.dynamicore.io/1',  // phase 2
  project: 'core-panel', // nombre del repo; no usar el name de package.json (se repite entre repos)
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_BUILD_VERSION,
  debug: process.env.NODE_ENV !== 'production',
});
```

```js
// src/index.js — first line
import './instrument';
```

Wrap the app (catches React render errors):

```jsx
import { ErrorBoundary } from 'corewatch';

<ErrorBoundary fallback={({ reset }) => <Retry onClick={reset} />}>
  <App />
</ErrorBoundary>
```

## Capture surfaces

| Surface | Catches |
|---|---|
| `window.onerror` | uncaught runtime + resource errors |
| `unhandledrejection` | promises with no `.catch()` |
| `<ErrorBoundary>` / `withErrorBoundary` | React render/lifecycle errors (+ component stack) |
| manual | `captureException`, `captureMessage`, `logger.*` |

Breadcrumbs (trail before the error): console, fetch, XHR, clicks, navigation,
and Redux actions.

## API

```js
import {
  init, captureException, captureMessage, logger,
  setUser, setTag, setExtra, addBreadcrumb,
  ErrorBoundary, withErrorBoundary, useCaptureError,
  createReduxEnhancer, createConsoleTransport, createHttpTransport,
} from 'corewatch';

setUser({ id: '123', role: 'admin' }); // PII is scrubbed before send anyway
captureException(err, { extra: 'checkout' });
logger.warn('Slow response', { durationMs: 5000 });
```

### Redux

```js
import { compose } from 'redux';
import { createReduxEnhancer } from 'corewatch';

const enhancers = [middlewareEnhancer, createReduxEnhancer()];
const store = createStore(rootReducer, compose(...enhancers));
```

### Verify (test button)

```jsx
<button type="button" onClick={() => { throw new Error('CoreWatch Test Error'); }}>
  Break the world
</button>
```

## Phase 2 — persist to your API

Events are stored through the DynamiCore CRUD
`POST {API_URL}/private/thirds/corewatch_events` (table `thirds.corewatch_events`).

```js
import { init, createConsoleTransport, createHttpTransport } from 'corewatch';
import { API_URL, API_CONTEXT } from 'settings'; // REACT_APP_API_URL / REACT_APP_API_CONTEXT

init({
  project: 'core-panel', // nombre del repo; no usar el name de package.json (se repite entre repos)
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_BUILD_VERSION,
  transports: [
    createConsoleTransport(),
    createHttpTransport({
      baseUrl: API_URL,       // default https://front.dynamicore.io
      context: API_CONTEXT,   // `context` header, only sent when set
    }),
  ],
});
```

Headers match the apps' axios interceptor: `Authorization` is the session
access token (read from `localStorage.accessToken` or the Cognito/Amplify keys;
pass `authorization: () => token` to override) and `context` is added only when
the app has one. Events raised before login are held until a token exists.

The API computes the `fingerprint` (grouping). Pending server-side: source-map
resolution.

## Build

```bash
npm run build   # src/ -> dist/ (CommonJS, browserslist targets)
```
