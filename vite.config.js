import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'gui/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
})
