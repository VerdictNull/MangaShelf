import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'

// Plugin to copy SQL migrations to output directory
function copyMigrationsPlugin() {
  return {
    name: 'copy-migrations',
    closeBundle() {
      const src = resolve('src/main/db/migrations')
      const dest = resolve('out/main/migrations')
      mkdirSync(dest, { recursive: true })
      for (const f of readdirSync(src).filter((f) => f.endsWith('.sql'))) {
        copyFileSync(resolve(src, f), resolve(dest, f))
      }
    }
  }
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        // p-queue and its deps are ESM-only; bundle them inline so CJS main works
        exclude: ['p-queue', 'eventemitter3', 'p-limit', 'yocto-queue']
      }),
      copyMigrationsPlugin()
    ],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
