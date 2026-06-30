import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/dify': {
        target: 'https://api.dify.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dify/, '/v1'),
      },
    },
  },
})
