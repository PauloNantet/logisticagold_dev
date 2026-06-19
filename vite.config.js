import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const PORT = env.PORT || 3000

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: `http://localhost:${PORT}`,
          changeOrigin: true
        }
      }
    }
  }
})
