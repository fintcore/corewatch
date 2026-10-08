# React

```js
import { ErrorBoundary, withErrorBoundary, useCaptureError } from '@dynamicore/corewatch/react';
```

The same names are also exported from the package root. Works with React 16.8 and newer; the build uses the classic JSX runtime, so `react/jsx-runtime` is not required.

## `<ErrorBoundary>`

Catches errors thrown while rendering its children, reports them with the React component stack (`event.extra.react.componentStack`, mechanism `react.errorBoundary`) and renders a fallback instead of a blank screen.

```jsx
<ErrorBoundary
  fallback={({ error, eventId, reset }) => (
    <div role="alert">
      <p>Something went wrong.</p>
      <small>Reference: {eventId}</small>
      <button onClick={reset}>Try again</button>
    </div>
  )}
  onError={(error, info, eventId) => analytics.track('crash', { eventId })}
  onReset={() => queryClient.resetQueries()}
>
  <Dashboard />
</ErrorBoundary>
```

| Prop | Type | Description |
|---|---|---|
| `fallback` | `ReactNode \| ({ error, eventId, reset }) => ReactNode` | What to render after an error. Pass `null` to render nothing. |
| `onError` | `(error, info, eventId) => void` | Called after the error is reported. Errors thrown here are ignored. |
| `onReset` | `() => void` | Called when `reset()` clears the error state. |

> **Always pass a `fallback`.** The built-in fallback is a minimal unstyled message in Spanish ("Algo salió mal." with a retry button) and renders DOM elements, so it cannot be used in React Native.

Place boundaries around independent areas (a route, a widget) so one failure does not take down the whole page.

## `withErrorBoundary(Component, props)`

Higher-order component that wraps `Component` in an `ErrorBoundary` with the given props.

```jsx
export default withErrorBoundary(SettingsPage, { fallback: <PageError /> });
```

The display name becomes `withErrorBoundary(SettingsPage)`.

## `useCaptureError()`

Error boundaries do not catch errors in event handlers or async code. The hook covers those:

```jsx
function SaveButton({ form }) {
  const { captureException, wrapAsync } = useCaptureError();

  const onSave = wrapAsync(async () => {
    await api.save(form); // a rejection is reported (mechanism 'hook.wrapAsync') and re-thrown
  }, { action: 'save-form' });

  const onExport = () => {
    try {
      exportCsv(form);
    } catch (error) {
      captureException(error, { action: 'export' });
      toast.error('Export failed');
    }
  };

  return <button onClick={onSave}>Save</button>;
}
```

Returns `{ captureException, captureMessage, addBreadcrumb, wrapAsync }`. All functions are stable between renders.
