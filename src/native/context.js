/**
 * React Native runtime context attached to every event: OS, device, screen,
 * app version, JS engine and the current navigation route.
 * No side effects on import; every native lookup is guarded.
 */

import { Dimensions, Platform } from 'react-native';

import { SDK } from '../core/sdk.js';

let appInfo = null;
let currentRoute = null;

/** Called by the native setup with `init({ app })` (explicit values win over auto-detection). */
export function setAppInfo(app) {
  appInfo = { ...detectExpoApp(), ...(app || {}) };
}

/** Called by the navigation integration on every route change. */
export function setCurrentRoute(route) {
  currentRoute = route || null;
}

export function getCurrentRoute() {
  return currentRoute;
}

/**
 * Reads name/version/build from Expo modules when the app has them installed.
 * The requires sit inside try/catch so Metro treats them as optional dependencies.
 */
function detectExpoApp() {
  const app = {};
  try {
    // eslint-disable-next-line global-require
    const Application = require('expo-application');
    app.name = Application.applicationName || undefined;
    app.id = Application.applicationId || undefined;
    app.version = Application.nativeApplicationVersion || undefined;
    app.build = Application.nativeBuildVersion || undefined;
  } catch (_) {
    /* expo-application not installed */
  }
  if (!app.version) {
    try {
      // eslint-disable-next-line global-require
      const ConstantsModule = require('expo-constants');
      const Constants = ConstantsModule.default || ConstantsModule;
      const expoConfig = Constants.expoConfig || Constants.manifest || {};
      app.name = app.name || expoConfig.name;
      app.version = expoConfig.version;
    } catch (_) {
      /* expo-constants not installed */
    }
  }
  Object.keys(app).forEach((key) => app[key] === undefined && delete app[key]);
  return app;
}

function dimensions(kind) {
  try {
    const { width, height, scale } = Dimensions.get(kind);
    return { w: Math.round(width), h: Math.round(height), scale };
  } catch (_) {
    return null;
  }
}

function osInfo() {
  const name = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : String(Platform.OS);
  const constants = Platform.constants || {};
  return {
    name,
    version: String(constants.osVersion || constants.Release || Platform.Version || ''),
  };
}

function deviceInfo() {
  const constants = Platform.constants || {};
  return {
    // Android exposes Brand/Model; iOS only exposes the idiom (phone, pad...).
    model: constants.Model || constants.interfaceIdiom || undefined,
    brand: constants.Brand || constants.Manufacturer || undefined,
    isPad: Boolean(Platform.isPad),
  };
}

/** Snapshot of the environment at capture time. */
export function getNativeContext() {
  const ctx = {
    sdk: SDK,
    timestamp: new Date().toISOString(),
  };

  try {
    ctx.os = osInfo();
    ctx.device = deviceInfo();
    ctx.screen = dimensions('screen');
    ctx.viewport = dimensions('window');
    ctx.runtime = {
      engine: typeof HermesInternal !== 'undefined' ? 'hermes' : 'jsc',
      // eslint-disable-next-line no-undef
      dev: typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : false,
    };
    if (appInfo) ctx.app = appInfo;
    if (currentRoute) {
      ctx.route = currentRoute.name;
      // Lets backends and the panel group by screen the same way they group web pages by URL.
      ctx.url = `app://${currentRoute.name}`;
    }
  } catch (_) {
    /* never let context gathering break capture */
  }

  return ctx;
}
