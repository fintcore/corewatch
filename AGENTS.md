# AGENTS.md — CoreWatch

Guide for agents (and humans) working on this package. Read it before changing code.

## What this is

`@dynamicore/corewatch` is a client-side, Sentry-style error monitoring SDK. This repository contains only the SDK: there is no backend, ingest or UI here. Events leave the SDK through transports (console by default; an HTTP transport for the DynamiCore API; or custom ones).

User-facing docs live in `docs/`. Keep them in sync with code changes.

## Layout

```
src/
  index.js                 Browser entry: init() = initClient(config, browserPlatform) + re-exports.
  core/                    PLATFORM-AGNOSTIC. Never touch window/document/navigator or React here.
    hub.js                 Client singleton + public capture API (captureException, setUser, logger...).
    client.js              createClient(config, transports, { getContext }): config, scope, pipeline.
    event.js               buildEvent(): the event contract. Keep it stable.
    scope.js               user / tags / extra / breadcrumbs (ring buffer).
    stacktrace.js          V8 and Gecko/Safari stack parser → { function, filename, lineno, colno }.
    sanitize.js            Masks sensitive keys with "[Filtered]"; tracks ancestors to cut cycles.
    dedupe.js              Drops repeated signatures (ring of 30).
    sdk.js                 SDK name/version (version must match package.json; a test enforces it).
    index.js               `@dynamicore/corewatch/core` entry for adapter authors.
  browser/                 Browser platform adapter.
    index.js               browserPlatform: { name, getContext, defaultTransports, setup }.
    context.js             Runtime context (url, UA, viewport, language, online) + parseUserAgent.
    globalHandlers.js      window 'error' (runtime + resources) and 'unhandledrejection'.
    breadcrumbs.js         Patches console.warn/error, fetch, XHR, DOM clicks, history.
  transports/
    consoleTransport.js    Styled console groups.
    httpTransport.js       DynamiCore API: queue, one POST per event, backoff, waits for a session token, keepalive flush.
  integrations/redux.js    createReduxEnhancer(): actions as breadcrumbs, state in extra['redux.state'].
  react/                   ErrorBoundary, withErrorBoundary, useCaptureError (+ index.js for the /react entry).
index.d.ts, react.d.ts, core.d.ts   Hand-written types, one per exports entry. Update them with the API.
test/                      Vitest suites (node environment; React via react-test-renderer).
scripts/                   clean, postbuild (module type markers), check-exports (package smoke test).
docs/                      User documentation.
```

## Event pipeline

`captureException / captureMessage / integration` → `client.process()`:

1. `config.enabled` false → drop.
2. `buildEvent()` merges error/message + config (project, release, environment) + scope snapshot + extra + `getContext()` from the platform.
3. `ignoreErrors` (substring or RegExp on `event.message`).
4. Dedupe (level + type + value + message + top 3 frames).
5. `sampleRate`.
6. `sanitize` on `user`, `extra`, `tags`, `breadcrumbs`. `context` and `exception` are **not** scrubbed.
7. `beforeSend(event)`; returning `null` drops it.
8. Dispatch to every transport; transport errors are swallowed.

Returns the `eventId` or `null`. The event shape is documented in `docs/event-schema.md`; do not rename fields.

## Non-negotiable rules

- **Never throw into the host app.** Wrap everything in `try/catch`.
- **No PII or credentials to a transport.** New fields that can hold user data go through `sanitize`. The default deny list includes Mexican identifiers (`curp`, `rfc`, `clabe`); matching is lower-case substring.
- **No side effects on import.** Patches and listeners are installed only in a platform's `setup()` (called by `init()`).
- **`src/core` is platform-agnostic.** Runtime code goes in an adapter folder.
- **Legacy compatible.** Babel targets the `browserslist` in `package.json`; JSX uses the classic runtime, so files with JSX import `React` explicitly. Works on React 16.8+.
- **Zero runtime dependencies.** `react` is a peer dependency.
- **Explicit `.js` extensions** in relative imports (the ESM build must run in Node).
- Guard globals with `typeof window/document/navigator !== 'undefined'` (SSR-safe).

## Build and verify

```bash
npm install            # also runs the build (prepare)
npm test               # Vitest
npm run build          # dist/esm (ESM, type: module) + dist/cjs (CommonJS)
npm run check:exports  # loads ".", "./react", "./core" by package name in ESM and CJS
```

Apps that consume the package through `file:` use `dist/`, so rebuild after changing `src/`. To check in a real app, run it with `init({ debug: true })` and throw a test error; events show up as collapsed console groups.

## Commits

Gitmoji + English imperative subject (`✨ Add ...`, `🐛 Fix ...`, `✅ Cover ...`). One focused change per commit. See CONTRIBUTING.md.

## Known gotchas

- **Dedupe has no time window.** A signature stays until 30 newer distinct signatures arrive, so the same error later in the session is not re-reported.
- **Redux before `init()`.** If the store is created before `init()`, each dispatch logs `[CoreWatch] called before init(); ignored.` Import the instrument file first.
- `attachState: true` stores the whole Redux state on every action (scrubbed only at capture). Use `stateTransformer`.
- Substring matching over-masks (`auth` masks `author`, `session` masks `sessionCount`).
- The default `ErrorBoundary` fallback is unstyled Spanish text rendered with DOM elements.
- `httpTransport` adds `visibilitychange`/`pagehide` listeners when created and never removes them.
- `sendBeacon` cannot send the `Authorization` header, so page-exit flushes use `fetch` with `keepalive` (~64 KB total). Huge events can be lost then.
- Global handlers only check `typeof window`. On React Native (`window === global`, no `addEventListener`) the browser adapter's `setup()` fails; the hub catches it, so `init()` does not crash, but nothing is captured automatically. That is what the planned native adapter solves.

## Roadmap

1. React Native adapter (`src/native`, `@dynamicore/corewatch/native`, picked by Metro via the `react-native` field). Design in `docs/platforms.md`.
2. Node adapter (`src/node`).
3. Move React out of the root entry in the next major, so non-React consumers do not need it.
