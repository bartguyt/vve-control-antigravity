import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/gocardless': {
        target: 'https://bankaccountdata.gocardless.com/api/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gocardless/, ''),
      },
    },
  },
})
