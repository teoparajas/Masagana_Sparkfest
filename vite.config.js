import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the built static assets (JS, CSS, HTML, icons)
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'FloodWatch MM',
        short_name: 'FloodWatch',
        description: 'Metro Manila flood risk and evacuation routing',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Precache everything Vite outputs (JS/CSS/HTML/images)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],

        runtimeCaching: [
          // OpenWeatherMap: try network first, fall back to last-fetched response
          {
            urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 30, // 30 min — weather goes stale fast
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Firestore reads (flood zones / evacuation centers / reports)
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Maps tiles/scripts — safe to cache aggressively, rarely change
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gmaps-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // lets you test the SW during `npm run dev`, not just prod builds
      },
    }),
  ],
});