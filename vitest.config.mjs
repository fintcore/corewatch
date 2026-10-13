import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Source files keep JSX in .js and use the classic runtime (explicit `import React`), like the published build.
  esbuild: {
    include: /\.jsx?$/,
    exclude: [],
    loader: 'jsx',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  resolve: {
    // The native adapter imports react-native; tests use a small stand-in instead of the real package.
    alias: { 'react-native': fileURLToPath(new URL('./test/stubs/react-native.js', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
    restoreMocks: true,
  },
});
