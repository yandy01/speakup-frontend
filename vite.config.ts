import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'SpeakUp AI',
        short_name: 'SpeakUp',
        description: 'Entraîne-toi à mieux parler en français et en anglais avec ton coach vocal IA.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#10121B',
        theme_color: '#10121B',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
        // Never cache authenticated data, API responses, audio, or Supabase records.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
            options: { cacheName: 'speakup-private-network-only' },
          },
        ],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
});
