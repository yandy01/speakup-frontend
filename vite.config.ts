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
        name: 'ELOQIA',
        short_name: 'ELOQIA',
        description: 'Développe ton éloquence et deviens un meilleur orateur avec ton coach vocal.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#F7F5F0',
        theme_color: '#F7F5F0',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
        // Never cache authenticated data, API responses, audio, or Supabase records.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
            options: { cacheName: 'eloqia-private-network-only' },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('lucide-react')) return 'vendor-icons';
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
});
