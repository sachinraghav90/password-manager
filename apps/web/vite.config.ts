import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: decodeURIComponent(new URL('../../', import.meta.url).pathname).replace(/^\/([A-Za-z]):/, (match, drive) => drive + ':'),
  optimizeDeps: {
    exclude: ['@vaultguard/auth', '@vaultguard/sync-supabase']
  }
})
