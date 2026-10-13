# CoreWatch · Expo example

A one-screen Expo app to try the React Native entry of CoreWatch. Each button triggers a different capture path, and the list under them shows what CoreWatch captured. It uses an in-memory transport, so nothing leaves the device.

| Button | What it exercises |
|---|---|
| Error manejado | `captureException` from a `try/catch`, PII scrubbing (`password` → `[Filtered]`) |
| Promesa sin catch | Unhandled rejection (Hermes tracker) |
| Fetch 404 + mensaje | `http` breadcrumb and `logger.warn` |
| Romper render | `ErrorBoundary` with the native fallback (dismiss the dev LogBox to see it) |
| Error no capturado | Uncaught error through `ErrorUtils` (`fatal`), then React Native's red box |

Every tap is also recorded as a `ui.touch` breadcrumb through `CoreWatch.wrap(App)`.

## Run

```bash
cd examples/expo
npm run setup   # builds the SDK from this repo, packs it and installs everything
npm run ios     # or: npm run android
```

After changing the SDK, run `npm run sdk && npm install` again and reload the app.

The SDK is installed from a tarball because Metro does not follow `file:` symlinks outside the project by default.
