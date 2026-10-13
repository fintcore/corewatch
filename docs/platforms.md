# Platforms and architecture

## Support

| Platform | Status | Entry point |
|---|---|---|
| React web (CRA, Vite, Next.js client, webpack) | ✅ Supported | `@dynamicore/corewatch`, `@dynamicore/corewatch/react` |
| Browser JavaScript without React | ✅ Supported | `@dynamicore/corewatch` (do not use the React exports) |
| Server-side rendering | ⚠️ Import is safe; call `init()` on the client only | — |
| React Native (Expo and bare) | ✅ Supported | `@dynamicore/corewatch` (Metro picks the native entry) or `@dynamicore/corewatch/native`. See [React Native](./react-native.md) |
| Node.js | 🗺️ Planned | `@dynamicore/corewatch/node` (planned) |
| Custom runtimes (workers, Electron, ...) | 🧩 Build your own adapter | `@dynamicore/corewatch/core` |

## Architecture

```
src/
├── core/          Platform-agnostic: client, hub, event, scope, sanitize, dedupe, stacktrace
├── browser/       Browser adapter: runtime context, global handlers, automatic breadcrumbs
├── native/        React Native adapter: context, ErrorUtils/rejections, navigation, touches, AppState, native ErrorBoundary
├── transports/    console, http
├── integrations/  redux
├── react/         ErrorBoundary, withErrorBoundary, useCaptureError
├── index.js       Browser entry: init() = initClient(config, browserPlatform)
└── native/index.js React Native entry: init() = initClient(config, nativePlatform)
```

Metro resolves `@dynamicore/corewatch` to `native/index.js` through the `react-native` export condition (and the `react-native` field for older Metro versions). Web bundlers ignore both and get the browser entry.

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

✅ Shipped. How each piece maps from the web:

| Piece | Web | React Native |
|---|---|---|
| Uncaught errors | `window` `error` | `ErrorUtils.setGlobalHandler`, chaining the previous handler; fatal errors wait (bounded) for a flush |
| Unhandled rejections | `unhandledrejection` | Hermes `enablePromiseRejectionTracker` (or `promise/rejection-tracking` on JSC) |
| Context | URL, user agent, viewport | `Platform`, `Dimensions`, app info from Expo, JS engine, current route |
| Breadcrumbs | clicks, `history` | touches via `wrap()`, `registerNavigationContainer()`; `fetch`, XHR and `console` as on web |
| `ErrorBoundary` fallback | DOM elements | `View` / `Text` / `Pressable` |
| Delivery | flush on `pagehide` | flush on `AppState` background and before fatal crashes |
| Stack traces | file URLs | Hermes frames (`address at` prefix removed); symbolication with source maps on the server |

Next steps: offline queue persisted to storage, server-side source maps, native (non-JS) crash capture.

### Node.js

A `node` adapter with `process.on('uncaughtException')` / `unhandledRejection`, OS and process context, an HTTP transport without browser APIs, and request-scoped data for servers.

Want to help? See [CONTRIBUTING](../CONTRIBUTING.md).
