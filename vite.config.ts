import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes('/node_modules/@firebase/firestore/')) return 'firebase-firestore'
          if (id.includes('/node_modules/@firebase/auth/')) return 'firebase-auth'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{html,js,css,png,svg,woff2}'] },
      manifest: {
        name: 'مساعد المعيد',
        short_name: 'المعيد',
        description: 'إدارة المقررات والسكاشن وقوائم الطلاب',
        lang: 'ar',
        dir: 'rtl',
        start_url: './',
        id: './',
        display: 'standalone',
        theme_color: '#16372f',
        background_color: '#f5f6ef',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
