import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 나중에 Express 서버(3001)로 API 요청 전달
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
