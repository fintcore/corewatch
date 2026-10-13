/**
 * React Native versions of the React bindings. The shared ErrorBoundary renders
 * DOM elements as its default fallback, which crash on native; these provide a
 * View/Text/Pressable fallback instead.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BaseErrorBoundary from '../react/ErrorBoundary.js';
import { getClient } from '../core/hub.js';
import { createTouchHandler } from './touch.js';

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' },
  title: { fontSize: 18, fontWeight: '600', color: '#2b2233', marginBottom: 16, textAlign: 'center' },
  button: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#6a5ae0' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  root: { flex: 1 },
});

/** Minimal built-in fallback. Apps should pass their own `fallback`. */
export function DefaultNativeFallback({ reset }) {
  return (
    <View style={styles.fallback} accessibilityRole="alert">
      <Text style={styles.title}>Algo salió mal.</Text>
      <Pressable onPress={reset} style={styles.button} accessibilityRole="button" accessibilityLabel="Reintentar">
        <Text style={styles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

/** Same API as the web ErrorBoundary (fallback, onError, onReset), safe on native. */
export function ErrorBoundary(props) {
  const fallback = props.fallback === undefined
    ? (args) => <DefaultNativeFallback {...args} />
    : props.fallback;
  return <BaseErrorBoundary {...props} fallback={fallback} />;
}

export function withErrorBoundary(WrappedComponent, boundaryProps = {}) {
  function Wrapped(props) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  Wrapped.displayName = `withErrorBoundary(${name})`;
  return Wrapped;
}

/**
 * Wraps the root component: touch breadcrumbs + an ErrorBoundary around the app.
 *
 *   export default CoreWatch.wrap(App);
 *
 * @param {React.ComponentType} RootComponent
 * @param {object} [options]
 * @param {boolean} [options.touchBreadcrumbs=true]
 * @param {object}  [options.errorBoundary]   props for the ErrorBoundary (fallback, onError...)
 */
export function wrap(RootComponent, options = {}) {
  const { touchBreadcrumbs = true, errorBoundary = {} } = options;
  const onTouchStart = touchBreadcrumbs ? createTouchHandler(getClient) : undefined;

  function CoreWatchRoot(props) {
    return (
      <View style={styles.root} onTouchStart={onTouchStart}>
        <ErrorBoundary {...errorBoundary}>
          <RootComponent {...props} />
        </ErrorBoundary>
      </View>
    );
  }

  const name = RootComponent.displayName || RootComponent.name || 'App';
  CoreWatchRoot.displayName = `CoreWatch(${name})`;
  return CoreWatchRoot;
}
