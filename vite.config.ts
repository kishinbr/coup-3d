import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // caminhos relativos: o build funciona em qualquer pasta ou hospedagem estática
  base: './',
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
