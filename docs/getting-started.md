# Getting started

This guide takes a React app from zero to its first captured error in about five minutes.

## Requirements

| | Supported |
|---|---|
| Browsers | Anything matched by `>0.2%, not dead, not op_mini all` (the published build is already transpiled) |
| React | 16.8 or newer, for the root and `/react` entry points. `@dynamicore/corewatch/core` does not import React |
| Bundlers | webpack 4/5 (including Create React App), Vite, Rollup, esbuild, Parcel |
| TypeScript | Types are bundled; no `@types` package needed |
| React Native | 0.70+ / Expo SDK 50+: see the [React Native guide](./react-native.md) |
| Node.js | Only to build your app. Server-side capture is on the [roadmap](./platforms.md) |

## 1. Install

```bash
npm install @dynamicore/corewatch
# or
yarn add @dynamicore/corewatch
# or
pnpm add @dynamicore/corewatch
```

## 2. Initialize as early as possible

Create an `instrument.js` file and import it **before anything else** in your entry point, so errors thrown while your app boots are captured too.

```js
// src/instrument.js
import * as CoreWatch from '@dynamicore/corewatch';

CoreWatch.init({
  project: 'my-app',                       // the app or repository name
  environment: process.env.NODE_ENV,        // 'production', 'staging'...
  release: process.env.REACT_APP_VERSION,   // the deployed version
  debug: process.env.NODE_ENV !== 'production',
});
```

```js
// src/index.js
import './instrument'; // must be the first import
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
```

`init()` installs the global error handlers and the automatic breadcrumbs. It is idempotent: calling it twice keeps the first configuration.

## 3. Catch render errors

Global handlers cannot see errors thrown while React renders. Wrap your tree in an `ErrorBoundary`:

```jsx
import { ErrorBoundary } from '@dynamicore/corewatch/react';

export default function App() {
  return (
    <ErrorBoundary fallback={({ reset }) => <button onClick={reset}>Try again</button>}>
      <Routes />
    </ErrorBoundary>
  );
}
```

See [React](./react.md) for the full API.

## 4. Verify

Add a temporary button and click it:

```jsx
<button type="button" onClick={() => { throw new Error('CoreWatch test error'); }}>
  Break the world
</button>
```

With the default configuration the event is printed as a collapsed group in the browser console (`ERROR CoreWatch test error`). Nothing leaves the browser until you add a network transport — see [Transports](./transports.md).

## Next steps

- [Configuration](./configuration.md): sampling, filtering, `beforeSend`.
- [Privacy](./privacy.md): what is scrubbed before an event is sent.
- [Transports](./transports.md): send events to your backend.
