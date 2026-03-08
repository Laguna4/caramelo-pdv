import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Caramelo PDV',
        short_name: 'CarameloPDV',
        description: 'Sistema de Ponto de Venda Caramelo',
        theme_color: '#f97316',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        sourcemap: false
      }
    })
  ],
  server: {
    port: 5176,
    strictPort: true,
  },
  css: {
    postcss: './postcss.config.js',
  },
})
