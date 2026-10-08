# Transports

A transport receives every processed event and decides where it goes. Pass a list to `init()`; each event is sent to all of them.

```js
import { init, createConsoleTransport, createHttpTransport } from '@dynamicore/corewatch';

init({
  transports: [createConsoleTransport(), createHttpTransport({ baseUrl: API_URL })],
});
```

Without `transports`, the browser entry uses the console transport only, so nothing leaves the browser.

## Console transport

Prints each event as a styled, collapsed group with the stack, breadcrumbs, user, tags and extra data. Useful in development.

```js
createConsoleTransport({ collapsed: false }); // expanded groups
```

## HTTP transport (DynamiCore API)

Persists events through the DynamiCore API (`POST {baseUrl}/private/thirds/corewatch_events`). If you are not on the DynamiCore platform, write a [custom transport](#custom-transports) instead.

```js
createHttpTransport({
  baseUrl: process.env.REACT_APP_API_URL,
  context: process.env.REACT_APP_API_CONTEXT,
});
```

| Option | Default | Description |
|---|---|---|
| `baseUrl` | `'https://front.dynamicore.io'` | API base URL. |
| `path` | `'/private/thirds/corewatch_events'` | Endpoint path. |
| `url` | — | Full endpoint; overrides `baseUrl` + `path`. |
| `authorization` | session token | `string` or `() => string`. By default it reads `localStorage.accessToken`, or the Amplify/Cognito `accessToken` key. |
| `context` | — | `string` or `() => string`, sent as the `context` header when present. |
| `platform` | `'web'` | Platform label stored with the event. |
| `company`, `client` | — | `number` or `() => number`. |
| `flushIntervalMs` | `2000` | Delay before sending queued events. |
| `maxQueue` | `100` | Queue size; the oldest events are dropped beyond it. |
| `maxRetries` | `3` | Retries per event. |
| `retryBaseMs` | `1000` | Base for exponential backoff (1 s, 2 s, 4 s...). |
| `debug` | `false` | Logs transport activity with `console.log`. |

How it behaves:

- **One request per event**, sent in order from an in-memory queue.
- **Waits for a session.** Without an `Authorization` value, events stay queued and are sent once the user signs in. Errors that happen before login are not lost.
- **Retries** network errors and `401`, `403`, `408`, `429` and `5xx` responses with exponential backoff. Other `4xx` responses are dropped. Retries are safe because the server deduplicates by `eventId`.
- **Flushes on page exit** (`pagehide`, or `visibilitychange` to hidden) with `fetch(..., { keepalive: true })`. Browsers limit keepalive requests to about 64 KB in total, so very large events (for example a full Redux state) can be lost at that moment.
- Uses the native `fetch` captured when the transport is created, so its own requests never show up as breadcrumbs.

## Custom transports

A transport is any object with a `name` and a `send(event)` method. `send` must not throw; errors are swallowed anyway so a failing transport never affects your app.

```js
const myTransport = {
  name: 'my-backend',
  send(event) {
    navigator.sendBeacon('/api/errors', JSON.stringify(event));
  },
};

init({ transports: [myTransport] });
```

Some ideas:

```js
// Only forward errors and above
const errorsOnly = (inner) => ({
  name: `errors-only(${inner.name})`,
  send: (event) => ['error', 'fatal'].includes(event.level) && inner.send(event),
});

// Keep the last events in memory, e.g. for a "report a problem" dialog
const recent = [];
const memory = { name: 'memory', send: (event) => recent.push(event) && recent.length > 20 && recent.shift() };
```

The event shape is documented in [Event schema](./event-schema.md).
