/**
 * Browser runtime context attached to every event (url, UA, viewport, language).
 * No side effects on import; every global access is guarded.
 */

import { SDK } from '../core/sdk';

/** Very light UA parse. Server-side enrichment can do better later. */
export function parseUserAgent(ua = '') {
  const browser = {
    name: 'unknown',
    version: '', 
  };
  const os = {
    name: 'unknown', 
  };

  try {
    if (/edg\//i.test(ua)) browser.name = 'Edge';
    else if (/chrome|crios/i.test(ua)) browser.name = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser.name = 'Firefox';
    else if (/safari/i.test(ua)) browser.name = 'Safari';

    const m = ua.match(/(edg|chrome|crios|firefox|fxios|version)\/(\d+[.\d]*)/i);
    // eslint-disable-next-line prefer-destructuring
    if (m) browser.version = m[2];

    if (/windows/i.test(ua)) os.name = 'Windows';
    else if (/mac os x/i.test(ua)) os.name = 'macOS';
    else if (/android/i.test(ua)) os.name = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os.name = 'iOS';
    else if (/linux/i.test(ua)) os.name = 'Linux';
  } catch (_) {
    /* noop */
  }

  return {
    browser,
    os, 
  };
}

/** Snapshot of the environment at capture time. */
export function getRuntimeContext() {
  const ctx = {
    sdk: SDK,
    timestamp: new Date().toISOString(),
    url: '',
    referrer: '',
    userAgent: '',
    language: '',
    screen: null,
    viewport: null,
    online: true,
  };

  try {
    if (typeof window !== 'undefined') {
      ctx.url = window.location ? window.location.href : '';
      ctx.viewport = {
        w: window.innerWidth,
        h: window.innerHeight, 
      };
      if (window.screen) {
        ctx.screen = {
          w: window.screen.width,
          h: window.screen.height, 
        };
      }
    }
    if (typeof document !== 'undefined') {
      ctx.referrer = document.referrer || '';
    }
    if (typeof navigator !== 'undefined') {
      ctx.userAgent = navigator.userAgent || '';
      ctx.language = navigator.language || '';
      ctx.online = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
      Object.assign(ctx, parseUserAgent(ctx.userAgent));
    }
  } catch (_) {
    /* never let context gathering break capture */
  }

  return ctx;
}
