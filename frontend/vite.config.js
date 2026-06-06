import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendTarget = 'http://127.0.0.1:5000'

function backendHealthPlugin() {
  return {
    name: 'genui-backend-health',
    configureServer() {
      fetch(`${backendTarget}/health`)
        .then((res) => {
          if (res.ok) console.log('[genui] Backend is running on :5000')
          else console.warn('[genui] Backend responded but /health failed. Check backend logs.')
        })
        .catch(() => {
          console.warn(
            '[genui] Backend not running on :5000. From project root run: npm run dev'
          )
        })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), backendHealthPlugin()],
  server: {
    proxy: {
      '/api': { target: backendTarget, changeOrigin: true },
      '/health': { target: backendTarget, changeOrigin: true },
    },
  },
})
