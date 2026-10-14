<p align="center">
  <a href="https://github.com/fintcore/corewatch">
    <img src=".github/assets/logo.svg" alt="CoreWatch" width="320" height="72">
  </a>
</p>

<p align="center">
  <b>Lightweight, Sentry-style error monitoring for React, React Native and the browser.</b><br>
  Capture errors with full context, keep personal data out, send events wherever you want.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@dynamicore/corewatch"><img src="https://img.shields.io/npm/v/@dynamicore/corewatch?color=6C5FC7&label=npm" alt="npm version"></a>
  <a href="https://github.com/fintcore/corewatch/actions/workflows/ci.yml"><img src="https://github.com/fintcore/corewatch/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://bundlephobia.com/package/@dynamicore/corewatch"><img src="https://img.shields.io/bundlephobia/minzip/@dynamicore/corewatch?color=6C5FC7&label=min%2Bgzip" alt="bundle size"></a>
  <img src="https://img.shields.io/badge/dependencies-0-6C5FC7" alt="zero dependencies">
  <img src="https://img.shields.io/badge/types-included-6C5FC7" alt="TypeScript types included">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-6C5FC7" alt="MIT license"></a>
</p>

<p align="center">
  <a href="./docs/getting-started.md">Getting started</a> ·
  <a href="./docs/configuration.md">Configuration</a> ·
  <a href="./docs/react.md">React</a> ·
  <a href="./docs/transports.md">Transports</a> ·
  <a href="./docs/privacy.md">Privacy</a> ·
  <a href="./docs/react-native.md">React Native</a> ·
  <a href="./docs/platforms.md">Platforms</a>
</p>

---

CoreWatch captures what breaks in your frontend (uncaught errors, unhandled promise rejections, React render crashes, failed resources) together with the trail of what the user did before it happened. Every event is scrubbed of credentials and personal data before it leaves the SDK, and is delivered through transports you control.

It was built at [DynamiCore](https://dynamicore.io) to monitor production fintech apps that run on legacy and modern React stacks alike.

## Features

- 🪲 **Automatic capture**: uncaught errors, unhandled rejections and failed scripts, images or stylesheets.
- ⚛️ **React first**: `<ErrorBoundary>` with component stacks, `withErrorBoundary()` and a `useCaptureError()` hook for event handlers and async code.
- 🍞 **Breadcrumbs**: clicks, navigation, `fetch`/XHR requests, console warnings and Redux actions leading up to each error.
- 🔒 **Privacy by default**: passwords, tokens, cards, emails, phones and Mexican identifiers (CURP, RFC, CLABE) are replaced with `[Filtered]`.
- 🎛️ **Control the noise**: sampling, `ignoreErrors`, duplicate suppression and a `beforeSend` hook.
- 🚚 **Pluggable transports**: console for development, HTTP with a queue and retries, or your own in a few lines.
- 🪶 **Small and safe**: zero runtime dependencies, no side effects on import, never throws into your app.
- 📱 **React Native and Expo**: same package and imports; Metro picks the native entry with crash, promise, touch, navigation and app lifecycle capture.
- 🧩 **Built for more platforms**: a platform-agnostic core with small adapters per runtime (Node is next).

## Install

```bash
npm install @dynamicore/corewatch
```

<details>
<summary>yarn / pnpm</summary>

```bash
yarn add @dynamicore/corewatch
pnpm add @dynamicore/corewatch
```

</details>

**Requirements:** React 16.8+ (only for the React APIs). Works with webpack 4/5 (including Create React App), Vite, Rollup and esbuild. The published code is already transpiled for browsers matching `>0.2%, not dead`.

## Quick start

**1. Initialize** in a file imported before anything else:

```js
// src/instrument.js
import * as CoreWatch from '@dynamicore/corewatch';

CoreWatch.init({
  project: 'my-app',
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_VERSION,
});
```

```js
// src/index.js
import './instrument'; // first line
```

**2. Catch render errors** with an error boundary:

```jsx
import { ErrorBoundary } from '@dynamicore/corewatch/react';

<ErrorBoundary fallback={({ eventId, reset }) => <CrashScreen eventId={eventId} onRetry={reset} />}>
  <App />
</ErrorBoundary>
```

**3. Add context** and capture what you handle yourself:

```js
import { setUser, setTag, captureException, logger } from '@dynamicore/corewatch';

setUser({ id: account.id, role: account.role });
setTag('feature', 'new-checkout');

try {
  await payments.confirm(order);
} catch (error) {
  captureException(error, { orderId: order.id });
}

logger.warn('Slow response', { durationMs: 5300 });
```

By default events are printed to the browser console, so you can try it without any backend. When you are ready, add a [transport](./docs/transports.md):

```js
import { init, createConsoleTransport, createHttpTransport } from '@dynamicore/corewatch';

init({
  project: 'my-app',
  transports: [createConsoleTransport(), createHttpTransport({ baseUrl: process.env.REACT_APP_API_URL })],
});
```

## What an event looks like

```json
{
  "eventId": "1a0fedc7cef584b49311869581000000",
  "level": "error",
  "message": "TypeError: Cannot read properties of undefined (reading 'name')",
  "exception": {
    "type": "TypeError",
    "value": "Cannot read properties of undefined (reading 'name')",
    "stack": [{ "function": "BrokenWidget", "filename": "https://app.example.com/static/js/70.chunk.js", "lineno": 1903, "colno": 25 }]
  },
  "mechanism": "react.errorBoundary",
  "project": "my-app",
  "release": "1.4.2",
  "environment": "production",
  "user": { "id": "7eb4f765", "email": "[Filtered]" },
  "breadcrumbs": [
    { "category": "http", "message": "GET https://api.example.com/dashboard → 200" },
    { "category": "ui.click", "message": "button \"Show report\"" }
  ],
  "context": { "url": "https://app.example.com/dashboard", "browser": { "name": "Chrome", "version": "154.0.0.0" }, "os": { "name": "macOS" } },
  "sdk": { "name": "corewatch", "version": "0.2.0" }
}
```

Full reference: [Event schema](./docs/event-schema.md).

## Entry points

| Import | Contents |
|---|---|
| `@dynamicore/corewatch` | `init()`, capture and scope API, `logger`, transports, Redux enhancer, React bindings |
| `@dynamicore/corewatch/react` | `ErrorBoundary`, `withErrorBoundary`, `useCaptureError` |
| `@dynamicore/corewatch/core` | Platform-agnostic core for writing adapters (no DOM, no React) |
| `@dynamicore/corewatch/native` | React Native entry (Metro resolves it automatically for the root import) |

Shipped as ES modules and CommonJS, with TypeScript declarations for every entry point.

## API at a glance

| Function | Description |
|---|---|
| `init(options)` | Starts the SDK. Idempotent. [Options](./docs/configuration.md) |
| `captureException(error, extra?)` | Reports an error. Returns the `eventId` or `null` if dropped. |
| `captureMessage(message, level?, extra?)` | Reports a message (`'info'` by default). |
| `logger.fatal / error / warn / info / debug` | Shortcuts for `captureMessage` with a level. |
| `setUser(user)` / `setTag(key, value)` / `setExtra(key, value)` | Context attached to every following event. |
| `addBreadcrumb(crumb)` | Adds a custom step to the trail. |
| `getClient()` | The active client, or `null` before `init()`. |
| `flush()` | Sends queued events now (resolves when transports are done). |
| `createReduxEnhancer(options?)` | Redux actions as breadcrumbs and state as context. [Redux](./docs/redux.md) |
| `createConsoleTransport()` / `createHttpTransport()` | Built-in transports. [Transports](./docs/transports.md) |

## Platform support

| Platform | Status |
|---|---|
| React web (CRA, Vite, Next.js client, webpack) | ✅ Supported |
| Browser JavaScript without React | ✅ Supported |
| Server-side rendering | ⚠️ Safe to import; call `init()` on the client |
| React Native (Expo and bare) | ✅ Supported |
| Node.js | 🗺️ Planned |

The core has no browser dependencies; each runtime plugs in through a small platform adapter. See [Platforms and architecture](./docs/platforms.md) for the design and the roadmap.

## Documentation

- [Getting started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [React](./docs/react.md)
- [Redux](./docs/redux.md)
- [Transports](./docs/transports.md)
- [Privacy and data scrubbing](./docs/privacy.md)
- [Event schema](./docs/event-schema.md)
- [React Native and Expo](./docs/react-native.md)
- [Platforms and architecture](./docs/platforms.md)

## Contributing

Issues and pull requests are welcome. Read the [contributing guide](./CONTRIBUTING.md) to set up the project, and the [security policy](./SECURITY.md) to report vulnerabilities privately.

## License

[MIT](./LICENSE) © DynamiCore
