import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: '127.0.0.1',
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.ECHO_API_TARGET || 'http://127.0.0.1:8788',
        changeOrigin: false,
      },
    },
    watch: {
      // 编辑器/工具写入时的临时目录与临时文件不要触发监听（Windows 上会 EBUSY 崩溃）
      ignored: ['**/.*.tmpdir/**', '**/*.tmp', '**/.git/**'],
      // Windows 下原生 watcher 偶尔漏事件，导致改了文件但页面还是旧的。轮询最稳。
      usePolling: true,
      interval: 400,
    },
  },
})
