import { defineConfig } from '@rslib/core'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: 'es2020',
      dts: true,
      output: {
        distPath: {
          root: './dist/esm',
        },
      },
    },
    {
      format: 'cjs',
      syntax: 'es2020',
      output: {
        distPath: {
          root: './dist/cjs',
        },
      },
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
      'plugins/error': './src/plugins/error.ts',
      'plugins/http': './src/plugins/http.ts',
      'plugins/behavior': './src/plugins/behavior.ts',
      'plugins/performance': './src/plugins/performance.ts',
      'plugins/web-vitals': './src/plugins/web-vitals.ts',
      'plugins/node-error': './src/plugins/node-error.ts',
      'plugins/node-http': './src/plugins/node-http.ts',
    },
  },
})
