# React Native and Expo

CoreWatch runs on React Native with the same package and the same imports as on the web. Metro picks the native entry automatically (through the `react-native` export condition and field), so `import * as CoreWatch from '@dynamicore/corewatch'` gives you the native version in your app and the browser version on the web.

## Requirements

| | Supported |
|---|---|
| Expo | SDK 50 or newer, in Expo Go, development builds and production builds |
| React Native | 0.70 or newer (bare projects work the same way) |
| JS engine | Hermes (default) and JavaScriptCore |
| Platforms | iOS and Android |

No native modules and no config plugin: it is plain JavaScript. If `expo-application` or `expo-constants` are installed, CoreWatch reads the app name, version and build from them.

## Setup

```bash
npx expo install @dynamicore/corewatch
# optional, for app name/version/build in every event
npx expo install expo-application
```

### 1. Initialize before the app renders

```js
// instrument.js
import * as CoreWatch from '@dynamicore/corewatch';
import * as SecureStore from 'expo-secure-store';

CoreWatch.init({
  project: 'my-app',
  environment: __DEV__ ? 'development' : 'production',
  release: '1.4.2',
  debug: __DEV__,
  transports: [
    ...(__DEV__ ? [CoreWatch.createConsoleTransport()] : []),
    CoreWatch.createHttpTransport({
      baseUrl: process.env.EXPO_PUBLIC_API_URL,
      // React Native has no localStorage session: tell the transport where the token is.
      authorization: () => SecureStore.getItem('accessToken'),
    }),
  ],
});
```

### 2. Import it first and wrap the root

**Expo Router** (`app/_layout.tsx`):

```tsx
import '../instrument';
import { Stack, useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';
import * as CoreWatch from '@dynamicore/corewatch';

function RootLayout() {
  const ref = useNavigationContainerRef();
  useEffect(() => CoreWatch.registerNavigationContainer(ref), [ref]);
  return <Stack />;
}

export default CoreWatch.wrap(RootLayout);
```

**React Navigation** (`App.tsx`):

```tsx
import './instrument';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as CoreWatch from '@dynamicore/corewatch';

const navigationRef = createNavigationContainerRef();

function App() {
  return (
    <NavigationContainer ref={navigationRef} onReady={() => CoreWatch.registerNavigationContainer(navigationRef)}>
      {/* screens */}
    </NavigationContainer>
  );
}

export default CoreWatch.wrap(App);
```

`wrap()` adds an `ErrorBoundary` around the app and records touches. `registerNavigationContainer()` records screen changes.

## What is captured

| Source | Mechanism | Notes |
|---|---|---|
| Uncaught JS errors | `onerror` | Through React Native's `ErrorUtils`. Fatal errors get level `fatal`. React Native's own handler (red box, crash) still runs afterwards. |
| Unhandled promise rejections | `unhandledrejection` | Hermes' rejection tracker (or `promise/rejection-tracking` on JSC). The dev warning is kept. |
| Render errors | `react.errorBoundary` | `ErrorBoundary`, `withErrorBoundary` and `wrap()`, with the component stack. |
| Manual | `manual` | `captureException`, `captureMessage`, `logger.*`, `useCaptureError`. |

Breadcrumbs:

| Category | From |
|---|---|
| `ui.touch` | `wrap()`: the tapped element, by `accessibilityLabel`, `testID` or `nativeID` plus the component name, e.g. `PayButton "Pagar"` |
| `navigation` | `registerNavigationContainer()`: `Home → Transfer` (route names only, never params) |
| `http` | `fetch` and `XMLHttpRequest`: method, URL, status, duration |
| `console` | `console.warn` / `console.error` |
| `app.lifecycle` | `AppState` changes: `active → background` |
| `redux.action` | `createReduxEnhancer()` |

Give important buttons an `accessibilityLabel` (it also helps screen readers) so touch breadcrumbs are readable.

## Event context

```json
{
  "os": { "name": "iOS", "version": "18.2" },
  "device": { "model": "phone", "isPad": false },
  "screen": { "w": 393, "h": 852, "scale": 3 },
  "viewport": { "w": 393, "h": 852, "scale": 3 },
  "runtime": { "engine": "hermes", "dev": false },
  "app": { "name": "My App", "id": "com.company.app", "version": "1.4.2", "build": "45" },
  "route": "Transfer",
  "url": "app://Transfer"
}
```

On Android `device` also has `brand` and `model` (e.g. `Google`, `Pixel 9`). Inside Expo Go, `app` comes from `app.json` and has `expoGo: true`. Pass `init({ app: { version, build } })` to override any value.

## Options specific to React Native

| Option | Default | Description |
|---|---|---|
| `app` | auto | `{ name, id, version, build }`, overrides what Expo reports. |
| `fatalFlushTimeoutMs` | `2000` | On a fatal error, how long to wait for queued events to be sent before React Native closes the app. |
| `integrations.appState` | `true` | Lifecycle breadcrumbs and a flush when the app goes to the background. |
| `integrations.globalHandlers` | `true` | `ErrorUtils` handler and rejection tracking. |
| `integrations.fetch` / `xhr` / `console` | `true` | Breadcrumbs. |

Everything else (`project`, `sampleRate`, `beforeSend`, `denyKeys`...) works as on the web. See [Configuration](./configuration.md).

## Transports

- `createConsoleTransport()` prints one plain line per event (Metro does not show console groups). Use it in development.
- `createHttpTransport()` works like on the web, with two differences: **`authorization` is required** (there is no `localStorage`), and `platform` defaults to `ios` / `android`.
- `CoreWatch.flush()` sends what is queued right away. CoreWatch already calls it when the app goes to the background and before a fatal crash.

## Error boundaries

```tsx
<CoreWatch.ErrorBoundary
  fallback={({ reset }) => (
    <View style={styles.center}>
      <Text>No pudimos cargar tus movimientos.</Text>
      <Button title="Reintentar" onPress={reset} />
    </View>
  )}
>
  <Movements />
</CoreWatch.ErrorBoundary>
```

The default fallback is a minimal `View`/`Text`/`Pressable` screen ("Algo salió mal." with a retry button). Pass your own for production.

In development, React Native's LogBox shows render errors even when a boundary caught them: dismiss it to see the fallback. Production builds only show the fallback.

## Limitations

- **JavaScript only.** Native crashes (Objective-C, Swift, Java, Kotlin) are not captured.
- **No offline persistence yet.** Events are kept in memory: if the app is killed while offline, queued events are lost.
- **Fatal crashes in release builds:** CoreWatch waits up to `fatalFlushTimeoutMs` for the HTTP request before the app closes. On a slow network the event can still be lost.
- **Stack traces in release** point to the minified bundle (`index.android.bundle:1:345678`). Symbolication with Hermes source maps has to happen on the server.
- **Expo web is not tested yet.** Depending on the Metro configuration it may resolve the native entry; the browser entry is the right one there.
