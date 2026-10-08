# Platforms and architecture

## Support

| Platform | Status | Entry point |
|---|---|---|
| React web (CRA, Vite, Next.js client, webpack) | ✅ Supported | `@dynamicore/corewatch`, `@dynamicore/corewatch/react` |
| Browser JavaScript without React | ✅ Supported | `@dynamicore/corewatch` (do not use the React exports) |
| Server-side rendering | ⚠️ Import is safe; call `init()` on the client only | — |
| React Native | 🗺️ Planned | `@dynamicore/corewatch/native` (planned) |
| Node.js | 🗺️ Planned | `@dynamicore/corewatch/node` (planned) |
| Custom runtimes (workers, Electron, ...) | 🧩 Build your own adapter | `@dynamicore/corewatch/core` |

## Architecture

```
src/
├── core/          Platform-agnostic: client, hub, event, scope, sanitize, dedupe, stacktrace
├── browser/       Browser adapter: runtime context, global handlers, automatic breadcrumbs
├── transports/    console, http
├── integrations/  redux
├── react/         ErrorBoundary, withErrorBoundary, useCaptureError
└── index.js       Browser entry: init() = initClient(config, browserPlatform)
```

`src/core` never touches `window`, `document` or `navigator`. Everything that depends on a runtime lives in a **platform adapter**:

```js
const platform = {
  name: 'browser',
  getContext: () => ({ /* attached to every event as event.context */ }),
  defaultTransports: () => [/* used when init() gets no transports */],
  setup: (client, config) => { /* install global handlers and breadcrumbs, once */ },
};
```

An entry point is just `initClient(config, platform)` plus re-exports of the shared API.

## Writing an adapter

```js
import { initClient } from '@dynamicore/corewatch/core';

const workerPlatform = {
  name: 'web-worker',
  getContext: () => ({ timestamp: new Date().toISOString(), location: self.location.href }),
  defaultTransports: () => [{ name: 'post-message', send: (event) => self.postMessage({ type: 'corewatch', event }) }],
  setup(client) {
    self.addEventListener('error', (e) => client.capture({ error: e.error, level: 'error', mechanism: 'onerror' }));
    self.addEventListener('unhandledrejection', (e) => client.capture({ error: e.reason, level: 'error', mechanism: 'unhandledrejection' }));
  },
};

export const init = (config) => initClient(config, workerPlatform);
export { captureException, captureMessage, setUser, setTag } from '@dynamicore/corewatch/core';
```

Rules every adapter follows:

- Never throw into the host app; wrap handlers in `try/catch`.
- No side effects on import; install everything inside `setup()`.
- Chain existing global handlers instead of replacing them.

## Roadmap

### React Native

Reuses `core`, the transports API and `useCaptureError`. Needs its own adapter for:

| Piece | Web | React Native |
|---|---|---|
| Uncaught errors | `window` `error` | `ErrorUtils.setGlobalHandler`, chaining the previous handler |
| Unhandled rejections | `unhandledrejection` | Hermes `enablePromiseRejectionTracker` |
| Context | URL, user agent, viewport | `Platform` (OS, version), `Dimensions`, app name and version |
| Breadcrumbs | clicks, `history` | touches on a root wrapper, React Navigation state changes (`fetch`, XHR and `console` work as on web) |
| `ErrorBoundary` fallback | DOM elements | must be provided with `View` / `Text` |
| Offline delivery | flush on `pagehide` | flush on `AppState` background, queue persisted to storage |
| Stack traces | file URLs | Hermes frames (`address at index.android.bundle`) symbolicated with source maps on the server |

It will ship as `@dynamicore/corewatch/native` and be selected automatically by Metro through the `react-native` field in `package.json`.

### Node.js

A `node` adapter with `process.on('uncaughtException')` / `unhandledRejection`, OS and process context, an HTTP transport without browser APIs, and request-scoped data for servers.

Want to help? See [CONTRIBUTING](../CONTRIBUTING.md).
