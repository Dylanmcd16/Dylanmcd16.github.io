import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

const rootDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), cesium()],
  base: '/',

  build: {
    rollupOptions: {
      input: {
        home: resolve(rootDirectory, 'index.html'),
        plrb: resolve(
          rootDirectory,
          'work/plrb-weather-systems/index.html',
        ),
        corteva: resolve(
          rootDirectory,
          'work/corteva-field-sensing/index.html',
        ),
        thesis: resolve(
          rootDirectory,
          'work/land-use-convective-weather/index.html',
        ),
        technicalProjectExample: resolve(
          rootDirectory,
          'work/technical-project-example/index.html',
        ),
      },
    },
  },
})
