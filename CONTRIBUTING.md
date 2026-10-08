# Contributing to CoreWatch

Thanks for helping! This guide covers how to set up the project and what we expect in a pull request.

## Setup

```bash
git clone https://github.com/fintcore/corewatch.git
cd corewatch
nvm use        # Node 22 (see .nvmrc); Node 18+ works
npm install    # also builds dist/
npm test
```

| Script | What it does |
|---|---|
| `npm test` | Runs the test suite once (Vitest) |
| `npm run test:watch` | Runs tests in watch mode |
| `npm run build` | Builds `dist/esm` and `dist/cjs` with Babel |
| `npm run check:exports` | Loads every `exports` entry through its public name in ESM and CommonJS |

### Trying it in an app

```bash
npm run build
npm pack                      # creates dynamicore-corewatch-x.y.z.tgz
cd ../my-app && npm install ../corewatch/dynamicore-corewatch-x.y.z.tgz
```

Or point a local app at the folder with `"@dynamicore/corewatch": "file:../corewatch"`, and run `npm run build` after every change, since apps consume `dist/`.

## Project rules

These keep the SDK safe to drop into any production app:

1. **Never throw into the host app.** Every handler, patch and transport is wrapped in `try/catch`.
2. **No side effects on import.** Monkey patches and listeners are installed only inside `init()`.
3. **No personal data reaches a transport.** New event fields that may contain user data go through `sanitize()`.
4. **`src/core` stays platform-agnostic.** No `window`, `document`, `navigator` or React there. Runtime-specific code goes in a platform adapter (`src/browser`, and later `src/native`, `src/node`). See [Platforms](./docs/platforms.md).
5. **Guard globals** with `typeof window !== 'undefined'` (and the same for `document` and `navigator`).
6. **Zero runtime dependencies.** `react` is a peer dependency.
7. **Legacy compatible.** The build targets the `browserslist` in `package.json` and React 16.8 with the classic JSX runtime, so every file with JSX imports `React` explicitly.
8. **The event shape is a contract.** Do not rename or remove fields; add new ones and update `index.d.ts` and `docs/event-schema.md`.

Relative imports use explicit `.js` extensions so the ES module build also runs in Node.

## Commits

We use [gitmoji](https://gitmoji.dev) with an English, imperative subject:

```
✨ Add React Native platform adapter
🐛 Report iPhone and iPad as iOS instead of macOS
📝 Document the Redux enhancer
✅ Cover the HTTP transport retries
```

Common ones: ✨ feature, 🐛 fix, ♻️ refactor, ✅ tests, 📝 docs, 🏷️ types, 📦️ build/packaging, 👷 CI, 🔒️ security/privacy, 🔧 config, ⚡️ performance.

Keep each commit focused on one change.

## Pull requests

- Add or update tests for any behavior change.
- Update the docs and `index.d.ts` when the public API changes.
- Add an entry under `Unreleased` in `CHANGELOG.md`.
- Make sure `npm test`, `npm run build` and `npm run check:exports` pass (CI runs them on Node 18, 20 and 22).

## Releasing (maintainers)

1. Update `version` in `package.json` and the `SDK.version` constant in `src/core/sdk.js` (a test checks they match).
2. Move the `Unreleased` changelog entries under the new version.
3. Commit with `🔖 Release vX.Y.Z`, push, and publish a GitHub release with the tag `vX.Y.Z`.
4. The release workflow tests, builds and publishes to npm with provenance (requires the `NPM_TOKEN` secret).
