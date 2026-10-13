// Minimal react-native stand-in for unit tests (the SDK never depends on it at runtime on the web).
import React from 'react';

export const Platform = {
  OS: 'ios',
  Version: '18.2',
  constants: { interfaceIdiom: 'phone', systemName: 'iOS', osVersion: '18.2' },
  select: (spec) => spec.ios ?? spec.default,
};

export const Dimensions = {
  get: (what) => (what === 'screen' ? { width: 393, height: 852, scale: 3, fontScale: 1 } : { width: 393, height: 852, scale: 3, fontScale: 1 }),
};

const appStateListeners = new Set();
export const AppState = {
  currentState: 'active',
  addEventListener(type, listener) {
    appStateListeners.add(listener);
    return { remove: () => appStateListeners.delete(listener) };
  },
  /** Test helper: simulate a state change. */
  __emit(state) {
    AppState.currentState = state;
    appStateListeners.forEach((listener) => listener(state));
  },
};

const host = (name) => {
  function Host({ children, ...props }) {
    return React.createElement(name, props, children);
  }
  Host.displayName = name;
  return Host;
};

export const View = host('View');
export const Text = host('Text');
export const Pressable = host('Pressable');
export const StyleSheet = { create: (styles) => styles };
