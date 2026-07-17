import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// This repository is currently named McDermott_Portfolio, so GitHub Pages
// serves it at https://dylanmcd16.github.io/McDermott_Portfolio/.
// Change this to '/' if you rename the repository to Dylanmcd16.github.io.
export default defineConfig({
  plugins: [react(), cesium()],
  base: '/',
})
