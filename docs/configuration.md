# Configuration

All options are passed to `init()`. Every option is optional.

```js
init({
  project: 'my-app',
  environment: 'production',
  release: '1.4.2',
  sampleRate: 0.5,
  ignoreErrors: ['ResizeObserver loop', /^ChunkLoadError/],
  beforeSend(event) {
    if (event.extra?.ignore) return null;
    return event;
  },
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `project` | `string` | `null` | App or repository name. Normalized to a slug (`'Core Panel'` → `'core-panel'`). Lets one backend group events by app. |
| `environment` | `string` | `'development'` | Deployment environment. |
| `release` | `string` | `null` | Deployed version. Used to tell which deploy introduced an error. |
| `enabled` | `boolean` | `true` | Set to `false` to turn capture off entirely (e.g. in tests). |
| `debug` | `boolean` | `false` | Logs SDK decisions (`[CoreWatch] dropped duplicate`, ...) to the console. |
| `sampleRate` | `number` | `1` | Fraction of events kept, from `0` to `1`. |
| `ignoreErrors` | `Array<string \| RegExp>` | `[]` | Drops events whose message contains the string or matches the expression. |
| `beforeSend` | `(event) => event \| null` | `null` | Last chance to edit an event. Return `null` to drop it. Runs after scrubbing. |
| `maxBreadcrumbs` | `number` | `50` | Size of the breadcrumb ring buffer. |
| `sanitize` | `boolean` | `true` | Scrub sensitive keys before sending. See [Privacy](./privacy.md). |
| `denyKeys` | `string[]` | built-in list | Keys to scrub. Replace or extend `DEFAULT_DENY_KEYS`. |
| `user` | `object` | `null` | Initial user, same as calling `setUser()`. |
| `transports` | `Transport[]` | `[console]` | Where events go. See [Transports](./transports.md). |
| `integrations` | `object` | all on | Turn individual integrations off (below). |

`dsn` is accepted and typed but reserved for a future hosted ingest; it has no effect today.

## Integrations

```js
init({
  integrations: {
    globalHandlers: true, // window 'error' and 'unhandledrejection'
    console: true,        // console.warn / console.error as breadcrumbs
    fetch: true,          // fetch requests as breadcrumbs
    xhr: true,            // XMLHttpRequest as breadcrumbs
    dom: true,            // clicks as breadcrumbs
    history: true,        // pushState / replaceState / popstate as breadcrumbs
  },
});
```

Integrations are installed once, inside `init()`. Importing the package has no side effects.

## Processing pipeline

Every capture goes through the same steps, in order:

1. `enabled === false` → dropped.
2. The event is built from the error or message, the configuration, the current scope (user, tags, extra, breadcrumbs) and the runtime context.
3. `ignoreErrors` is applied to `event.message`.
4. Duplicates are dropped (same level, type, value, message and top three frames among the last 30 distinct events).
5. `sampleRate` is applied.
6. `user`, `extra`, `tags` and `breadcrumbs` are scrubbed (if `sanitize` is on).
7. `beforeSend` runs.
8. The event is handed to every transport. A failing transport never affects the others or your app.

`captureException()` and `captureMessage()` return the `eventId`, or `null` when the event was dropped.

## Scope

The scope is attached to every event captured after it is set:

```js
import { setUser, setTag, setExtra, addBreadcrumb } from '@dynamicore/corewatch';

setUser({ id: 'u_123', username: 'ana' });
setTag('feature', 'new-checkout');
setExtra('cart', { items: 3 });
addBreadcrumb({ category: 'auth', message: 'Signed in', level: 'info' });
```

Call `setUser(null)` on sign-out.
