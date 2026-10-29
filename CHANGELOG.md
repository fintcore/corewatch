# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- The HTTP transport sends events to `/marketplace/apps/tools/services/corewatch/events` by default (was `/private/thirds/corewatch_events`). Set `path` or `url` to use another endpoint.

## [0.2.0] - 2026-10-14

### Added

- **React Native and Expo support.** Metro resolves `@dynamicore/corewatch` to the native entry (also available as `@dynamicore/corewatch/native`):
  - uncaught errors through `ErrorUtils` (fatal crashes wait up to `fatalFlushTimeoutMs` for delivery) and unhandled rejections through Hermes or `promise/rejection-tracking`;
  - context with OS, device, screen, JS engine, app name/version/build (from `init({ app })`, `expo-application` or `expo-constants`) and the current route;
  - `wrap(App)` with touch breadcrumbs and a root `ErrorBoundary`, `registerNavigationContainer()` for React Navigation and Expo Router, `AppState` lifecycle breadcrumbs;
  - native `ErrorBoundary` / `withErrorBoundary` with a `View`/`Text`/`Pressable` fallback.
- `flush()` sends queued events on demand.
- Console transport options `styled` and `grouped` (plain, one-line output for React Native and Node).

### Fixed

- Hermes frames no longer keep the `address at` prefix.
- Errors passed to `console.warn`/`console.error` keep their message in breadcrumbs instead of `{}`.
- `@dynamicore/corewatch/react` and `@dynamicore/corewatch/core` now resolve in bundlers that ignore `exports`, such as webpack 4 (Create React App 4).

## [0.1.0] - 2026-10-12

First public version.

### Added

- `init()` with project, environment, release, sampling, `ignoreErrors`, `beforeSend` and duplicate suppression.
- Automatic capture of uncaught errors, unhandled rejections and failed resources.
- Automatic breadcrumbs for clicks, navigation, `fetch`, XHR and console warnings.
- PII and secret scrubbing with a configurable deny list, including CURP, RFC and CLABE.
- React bindings: `ErrorBoundary`, `withErrorBoundary`, `useCaptureError` (also at `@dynamicore/corewatch/react`).
- Redux enhancer for action breadcrumbs and state context.
- Console transport and DynamiCore HTTP transport (queue, retries, session wait, keepalive flush).
- Platform-agnostic core with a platform adapter contract (`@dynamicore/corewatch/core`).
- ES module and CommonJS builds with TypeScript declarations.

### Fixed

- Objects referenced twice in an event are no longer replaced by `"[Circular]"`.
- iPhone and iPad are reported as iOS instead of macOS.
- The capture mechanism is no longer duplicated inside `event.extra`.

[Unreleased]: https://github.com/fintcore/corewatch/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/fintcore/corewatch/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fintcore/corewatch/releases/tag/v0.1.0
