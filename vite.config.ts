import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    cors: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Core React and router - loaded on every page
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // PDF libraries - only loaded when generating PDFs
          'vendor-pdf': ['@react-pdf/renderer'],
          // Map library - only loaded on hashrate heating page
          'vendor-maps': ['react-simple-maps'],
        },
      },
    },
  },
})
