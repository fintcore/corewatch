# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/fintcore/corewatch/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fintcore/corewatch/releases/tag/v0.1.0
