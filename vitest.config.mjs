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
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
    restoreMocks: true,
  },
});
