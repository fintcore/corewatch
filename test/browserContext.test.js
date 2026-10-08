import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRuntimeContext, parseUserAgent } from '../src/browser/context.js';
import { SDK } from '../src/core/sdk.js';

describe('parseUserAgent', () => {
  it.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36', 'Chrome', '154.0.0.0', 'macOS'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', 'Edge', '154.0.0.0', 'Windows'],
    ['Mozilla/5.0 (Windows NT 10.0; rv:141.0) Gecko/20100101 Firefox/141.0', 'Firefox', '141.0', 'Windows'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1', 'Safari', '19.1', 'iOS'],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', 'Chrome', '154.0.0.0', 'Android'],
  ])('detects %#', (ua, browser, version, os) => {
    expect(parseUserAgent(ua)).toEqual({ browser: { name: browser, version }, os: { name: os } });
  });

  it('falls back to unknown', () => {
    expect(parseUserAgent('')).toEqual({ browser: { name: 'unknown', version: '' }, os: { name: 'unknown' } });
  });
});

describe('getRuntimeContext', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('works without browser globals (SSR)', () => {
    vi.stubGlobal('navigator', undefined); // Node >= 21 defines a global navigator
    const ctx = getRuntimeContext();
    expect(ctx).toMatchObject({ sdk: SDK, url: '', userAgent: '', online: true });
    expect(Date.parse(ctx.timestamp)).not.toBeNaN();
  });

  it('reads window, document and navigator', () => {
    vi.stubGlobal('window', { location: { href: 'https://app.io/a' }, innerWidth: 1280, innerHeight: 720, screen: { width: 1920, height: 1080 } });
    vi.stubGlobal('document', { referrer: 'https://app.io/' });
    vi.stubGlobal('navigator', { userAgent: 'Firefox/141.0 (Windows)', language: 'es-MX', onLine: false });

    expect(getRuntimeContext()).toMatchObject({
      url: 'https://app.io/a',
      referrer: 'https://app.io/',
      viewport: { w: 1280, h: 720 },
      screen: { w: 1920, h: 1080 },
      language: 'es-MX',
      online: false,
      browser: { name: 'Firefox', version: '141.0' },
      os: { name: 'Windows' },
    });
  });
});
