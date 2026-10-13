import * as CoreWatch from '@dynamicore/corewatch';

// In-memory transport so the test screen can show what CoreWatch captured (nothing leaves the device).
const listeners = new Set();
export const captured = [];
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

const screenTransport = {
  name: 'screen',
  send(event) {
    captured.unshift(event);
    listeners.forEach((fn) => fn());
  },
};

CoreWatch.init({
  project: 'corewatch-expo-example',
  environment: 'development',
  debug: true,
  app: { build: '1' },
  transports: [CoreWatch.createConsoleTransport(), screenTransport],
});
