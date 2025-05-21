import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Оставляем allowedHosts, чтобы разрешить доступ через queue.mnu.kz
    allowedHosts: ['queue.mnu.kz', 'localhost'],
    // Обновляем настройки hmr
    hmr: {
      clientPort: 443
    }
  }
})