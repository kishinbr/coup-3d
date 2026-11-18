import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // caminhos relativos: o build funciona em qualquer pasta ou hospedagem estática
  base: './',
  build: {
    chunkSizeWarningLimit: 1600,
  },
  server: {
    // em desenvolvimento, /api (salas e WebSockets) vai para o servidor local (npm run dev:server)
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', ws: true, changeOrigin: true },
    },
  },
})
