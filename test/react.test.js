import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as hub from '../src/core/hub.js';
import { ErrorBoundary, useCaptureError, withErrorBoundary } from '../src/react/index.js';

let sent;

beforeEach(() => {
  sent = [];
  hub.initClient({ transports: [{ name: 'memory', send: (e) => sent.push(e) }] });
  // React logs caught render errors; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => hub._resetClient());

function Broken() {
  throw new TypeError("Cannot read properties of undefined (reading 'name')");
}

const render = (element) => {
  let renderer;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
};

describe('ErrorBoundary', () => {
  it('reports render errors with the component stack', () => {
    render(<ErrorBoundary fallback={<p>oops</p>}><Broken /></ErrorBoundary>);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ mechanism: 'react.errorBoundary', exception: { type: 'TypeError' } });
    expect(sent[0].extra.react.componentStack).toContain('Broken');
  });

  it('renders a function fallback with the event id and a reset callback', () => {
    const onReset = vi.fn();
    const renderer = render(
      <ErrorBoundary onReset={onReset} fallback={({ eventId, reset }) => <button onClick={reset}>{eventId}</button>}>
        <Broken />
      </ErrorBoundary>,
    );
    const button = renderer.root.findByType('button');
    expect(button.props.children).toBe(sent[0].eventId);

    act(() => button.props.onClick());
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('calls onError and survives a throwing callback', () => {
    const onError = vi.fn(() => { throw new Error('consumer bug'); });
    expect(() => render(<ErrorBoundary onError={onError} fallback={null}><Broken /></ErrorBoundary>)).not.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.any(TypeError), expect.anything(), sent[0].eventId);
  });

  it('renders children when nothing throws', () => {
    const renderer = render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(renderer.toJSON()).toEqual({ type: 'p', props: {}, children: ['fine'] });
    expect(sent).toHaveLength(0);
  });
});

describe('withErrorBoundary', () => {
  it('wraps a component and sets a display name', () => {
    function Page() {
      return <Broken />;
    }
    const Wrapped = withErrorBoundary(Page, { fallback: <p>oops</p> });
    const renderer = render(<Wrapped />);

    expect(Wrapped.displayName).toBe('withErrorBoundary(Page)');
    expect(renderer.toJSON().children).toEqual(['oops']);
    expect(sent).toHaveLength(1);
  });
});

describe('useCaptureError', () => {
  it('reports and rethrows async failures', async () => {
    let api;
    function Probe() {
      api = useCaptureError();
      return null;
    }
    render(<Probe />);

    const failing = api.wrapAsync(async () => { throw new Error('save failed'); }, { action: 'save' });
    await expect(failing()).rejects.toThrow('save failed');
    expect(sent[0]).toMatchObject({ mechanism: 'hook.wrapAsync', extra: { action: 'save' } });

    api.captureMessage('note', 'warning');
    expect(sent[1].level).toBe('warning');
  });
});
