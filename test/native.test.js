import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Each test loads a fresh copy of the adapter: it keeps module-level state
// (installed handlers, AppState subscription) exactly like a real app does.
async function load() {
  vi.resetModules();
  const CoreWatch = await import('../src/native/index.js');
  const RN = await import('react-native');
  return { CoreWatch, RN };
}

function memory() {
  const sent = [];
  const flush = vi.fn(() => Promise.resolve());
  return { sent, flush, transport: { name: 'memory', send: (e) => sent.push(e), flush } };
}

let previousHandler;

beforeEach(() => {
  previousHandler = vi.fn();
  let handler = previousHandler;
  globalThis.ErrorUtils = {
    getGlobalHandler: () => handler,
    setGlobalHandler: (next) => {
      handler = next;
    },
    /** Test helper: what React Native calls on an uncaught error. */
    trigger: (error, isFatal) => handler(error, isFatal),
  };
  globalThis.__DEV__ = false;
});

afterEach(() => {
  delete globalThis.ErrorUtils;
  delete globalThis.HermesInternal;
  delete globalThis.__DEV__;
  vi.useRealTimers();
});

describe('React Native adapter', () => {
  it('attaches OS, device, screen, runtime and app info to events', async () => {
    globalThis.HermesInternal = {};
    const { CoreWatch } = await load();
    const { sent, transport } = memory();
    CoreWatch.init({ project: 'Mi App', transports: [transport], app: { name: 'Mi App', version: '2.1.0', build: '45' } });
    CoreWatch.captureMessage('hello');

    expect(sent[0].project).toBe('mi-app');
    expect(sent[0].context).toMatchObject({
      os: { name: 'iOS', version: '18.2' },
      device: { model: 'phone', isPad: false },
      screen: { w: 393, h: 852, scale: 3 },
      runtime: { engine: 'hermes', dev: false },
      app: { name: 'Mi App', version: '2.1.0', build: '45' },
    });
  });

  it('reports uncaught errors and keeps React Native’s handler', async () => {
    const { CoreWatch } = await load();
    const { sent, transport } = memory();
    CoreWatch.init({ transports: [transport] });

    const error = new TypeError('undefined is not a function');
    globalThis.ErrorUtils.trigger(error, false);

    expect(sent[0]).toMatchObject({ level: 'error', mechanism: 'onerror', exception: { type: 'TypeError' } });
    expect(sent[0].extra).toMatchObject({ handled: false, isFatal: false });
    expect(previousHandler).toHaveBeenCalledWith(error, false);
  });

  it('flushes before letting a fatal error crash the app', async () => {
    const { CoreWatch } = await load();
    const { sent, flush, transport } = memory();
    let release;
    flush.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    CoreWatch.init({ transports: [transport] });

    const error = new Error('boom');
    globalThis.ErrorUtils.trigger(error, true);

    expect(sent[0].level).toBe('fatal');
    expect(flush).toHaveBeenCalledWith(true);
    expect(previousHandler).not.toHaveBeenCalled();

    release();
    await new Promise((resolve) => setTimeout(resolve, 0)); // well under the 2s fatal timeout
    expect(previousHandler).toHaveBeenCalledWith(error, true);
    expect(previousHandler).toHaveBeenCalledOnce();
  });

  it('does not wait forever for a slow flush on a fatal error', async () => {
    vi.useFakeTimers();
    const { CoreWatch } = await load();
    const { flush, transport } = memory();
    flush.mockImplementation(() => new Promise(() => {}));
    CoreWatch.init({ transports: [transport], fatalFlushTimeoutMs: 500 });

    globalThis.ErrorUtils.trigger(new Error('boom'), true);
    expect(previousHandler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(previousHandler).toHaveBeenCalledOnce();
  });

  it('reports unhandled promise rejections through Hermes', async () => {
    let tracker;
    globalThis.HermesInternal = { enablePromiseRejectionTracker: (options) => { tracker = options; } };
    const { CoreWatch } = await load();
    const { sent, transport } = memory();
    CoreWatch.init({ transports: [transport] });

    expect(tracker.allRejections).toBe(true);
    tracker.onUnhandled(1, new Error('request failed'));
    expect(sent[0]).toMatchObject({ mechanism: 'unhandledrejection', exception: { value: 'request failed' } });
  });

  it('records lifecycle breadcrumbs and flushes when the app goes to the background', async () => {
    const { CoreWatch, RN } = await load();
    const { sent, flush, transport } = memory();
    CoreWatch.init({ transports: [transport] });

    RN.AppState.__emit('inactive');
    RN.AppState.__emit('background');
    expect(flush).toHaveBeenCalledOnce();

    CoreWatch.captureMessage('after');
    expect(sent[0].breadcrumbs.filter((c) => c.category === 'app.lifecycle').map((c) => c.message))
      .toEqual(['active → inactive', 'inactive → background']);
    RN.AppState.__emit('active');
  });

  it('tracks navigation without recording route params', async () => {
    const { CoreWatch } = await load();
    const { sent, transport } = memory();
    CoreWatch.init({ transports: [transport] });

    let route = { name: 'Home', key: 'home-1' };
    const listeners = [];
    const container = {
      getCurrentRoute: () => route,
      addListener: (type, listener) => { listeners.push(listener); return () => listeners.splice(listeners.indexOf(listener), 1); },
    };
    const unsubscribe = CoreWatch.registerNavigationContainer({ current: container });

    route = { name: 'Transfer', key: 'transfer-1', params: { clabe: '012345678901234567' } };
    listeners.forEach((l) => l());
    listeners.forEach((l) => l()); // same route again: ignored
    CoreWatch.captureMessage('on transfer');

    const nav = sent[0].breadcrumbs.filter((c) => c.category === 'navigation');
    expect(nav).toEqual([expect.objectContaining({ message: 'Home → Transfer', data: { from: 'Home', to: 'Transfer' } })]);
    expect(sent[0].context).toMatchObject({ route: 'Transfer', url: 'app://Transfer' });
    expect(JSON.stringify(sent[0])).not.toContain('012345678901234567');

    unsubscribe();
    expect(listeners).toHaveLength(0);
  });

  it('defaults the HTTP transport platform to the OS', async () => {
    const { CoreWatch } = await load();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const transport = CoreWatch.createHttpTransport({ baseUrl: 'https://api.test', authorization: 'token' });
    CoreWatch.init({ transports: [transport] });
    CoreWatch.captureMessage('hi');
    await CoreWatch.flush();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).platform).toBe('ios');
    vi.unstubAllGlobals();
  });

  it('renders a native fallback instead of DOM elements', async () => {
    const { CoreWatch } = await load();
    const { sent, transport } = memory();
    CoreWatch.init({ transports: [transport] });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    function Broken() {
      throw new Error('render failed');
    }
    let renderer;
    act(() => {
      renderer = TestRenderer.create(<CoreWatch.ErrorBoundary><Broken /></CoreWatch.ErrorBoundary>);
    });

    const types = [];
    const walk = (node) => { if (node && typeof node === 'object') { types.push(node.type); (node.children || []).forEach(walk); } };
    walk(renderer.toJSON());
    expect(types).toEqual(['View', 'Text', 'Pressable', 'Text']);
    expect(sent[0].mechanism).toBe('react.errorBoundary');
  });

  it('wrap() adds an error boundary and touch breadcrumbs', async () => {
    const { CoreWatch } = await load();
    const { sent, transport } = memory();
    CoreWatch.init({ transports: [transport] });

    function App() {
      return <CoreWatch.ErrorBoundary fallback={null}><></></CoreWatch.ErrorBoundary>;
    }
    const Wrapped = CoreWatch.wrap(App);
    let renderer;
    act(() => {
      renderer = TestRenderer.create(<Wrapped />);
    });
    expect(Wrapped.displayName).toBe('CoreWatch(App)');

    // What React passes to onTouchStart: a synthetic event whose fiber points at the tapped element.
    function PayButton() {}
    const fiber = {
      memoizedProps: {},
      elementType: 'RCTView',
      return: { memoizedProps: { accessibilityLabel: 'Pagar' }, elementType: { name: 'Pressable' }, return: { memoizedProps: {}, elementType: PayButton } },
    };
    const root = renderer.root.findByType('View');
    act(() => root.props.onTouchStart({ _targetInst: fiber }));
    CoreWatch.captureMessage('after tap');

    expect(sent[0].breadcrumbs.find((c) => c.category === 'ui.touch')).toMatchObject({ message: 'PayButton "Pagar"' });
  });
});
