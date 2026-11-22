import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{html,js,css,png,svg,woff2}'] },
      manifest: {
        name: 'سكشن | لوحة المعيد',
        short_name: 'سكشن',
        description: 'إدارة المقررات والسكاشن وقوائم الطلاب',
        lang: 'ar',
        dir: 'rtl',
        start_url: './',
        display: 'standalone',
        theme_color: '#16372f',
        background_color: '#f5f6ef',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
