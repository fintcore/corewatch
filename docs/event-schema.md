# Event schema

Every transport receives events with this shape. It is a stable contract: fields are only added, never renamed, within a major version.

```ts
interface CoreWatchEvent {
  eventId: string;            // 32 hex chars, generated on the client
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  message: string | null;     // "TypeError: x is undefined" for exceptions
  exception: {
    type: string;             // "TypeError"
    value: string;            // "x is undefined"
    stack: Array<{ function?: string; filename?: string; lineno?: number; colno?: number }>;
  } | null;                   // null for captureMessage()
  mechanism: string;          // how it was captured (see below)
  project: string | null;     // slug from init({ project })
  release: string | null;
  environment: string | null;
  context: object;            // runtime snapshot from the platform adapter (see below)
  user: object | null;        // scrubbed
  tags: object;               // scrubbed
  extra: object;              // scrubbed
  breadcrumbs: Array<{ timestamp: string; category: string; level: string; message?: string; data?: object }>; // scrubbed
  sdk: { name: 'corewatch'; version: string };
}
```

## `mechanism`

| Value | Source |
|---|---|
| `manual` | `captureException()`, `captureMessage()`, `logger.*` |
| `onerror` | Uncaught error (`window` `error` event) |
| `resource` | An image, script or stylesheet failed to load (level `warning`) |
| `unhandledrejection` | A promise rejected without a handler |
| `react.errorBoundary` | `<ErrorBoundary>`; the component stack is in `extra.react.componentStack` |
| `hook.wrapAsync` | A function wrapped with `useCaptureError().wrapAsync` |

## `context` (browser)

```json
{
  "sdk": { "name": "corewatch", "version": "0.1.0" },
  "timestamp": "2026-10-02T23:04:17.903Z",
  "url": "https://app.example.com/dashboard",
  "referrer": "https://app.example.com/login",
  "userAgent": "Mozilla/5.0 ...",
  "language": "es-419",
  "online": true,
  "viewport": { "w": 972, "h": 1009 },
  "screen": { "w": 1800, "h": 1169 },
  "browser": { "name": "Chrome", "version": "154.0.0.0" },
  "os": { "name": "macOS" }
}
```

Other platforms provide their own `context` (for example OS version and device model on React Native).

## Breadcrumb categories

| Category | Recorded by |
|---|---|
| `console` | `console.warn` / `console.error` |
| `http` | `fetch` and `XMLHttpRequest` (method, URL, status, duration) |
| `ui.click` | Clicks, with a short element description |
| `navigation` | `pushState`, `replaceState`, `popstate` |
| `redux.action` | The Redux enhancer |
| `default` | `addBreadcrumb()` without a category |

## Grouping

The SDK does not group events. Backends usually compute a fingerprint from `project`, `exception.type`, `exception.value` (or `message`) and the top stack frame, after removing build hashes from file names (`main.3f2a1b9c.chunk.js` → `main.chunk.js`) so each deploy does not create new groups.
