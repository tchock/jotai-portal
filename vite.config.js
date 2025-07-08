import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: {
        'jotai-related': resolve(__dirname, 'src/index.ts'),
      },
      name: 'jotai-related',
    },
    rollupOptions: {
      external: ['react', 'jotai/vanilla', 'jotai/vanilla/utils'],
      output: {
        globals: {
          react: 'react',
        },
      },
    },
  },
})
