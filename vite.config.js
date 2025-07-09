import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: {
        'jotai-portal': resolve(__dirname, 'src/index.ts'),
      },
      name: 'jotai-portal',
    },
    rollupOptions: {
      external: ['react', 'jotai/vanilla', 'jotai/vanilla/utils'],
      output: {
        globals: {
          react: 'react',
          'jotai/vanilla': 'jotai',
          'jotai/vanilla/utils': 'jotaiUtils',
        },
      },
    },
  },
  plugins: [
    dts({
      exclude: ['src/**/*.test.ts', 'node_modules/**'],
    }),
  ],
})
