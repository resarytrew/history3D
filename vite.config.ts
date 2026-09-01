import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls.js',
      'three/examples/jsm/environments/RoomEnvironment.js',
      'three/examples/jsm/loaders/GLTFLoader.js',
    ],
  },
  build: {
    manifest: true,
    sourcemap: false,
    target: 'es2022',
  },
})
