// Ambient shims so `tsc` passes before `npm install` has run.
// Once cesium and vite-plugin-cesium are installed, their own types
// (or these fallbacks) keep the build green either way.
declare module 'cesium'

declare module 'vite-plugin-cesium' {
  import type { Plugin } from 'vite'
  const cesium: (options?: Record<string, unknown>) => Plugin
  export default cesium
}
