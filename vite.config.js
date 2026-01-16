import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Automatically register service worker
      registerType: "autoUpdate",
      injectRegister: "auto",

      // Workbox settings
      workbox: {
        cleanupOutdatedCaches: true,  // Safisha cache ya zamani
        skipWaiting: true,            // Lazimisha service worker mpya kuchukua control
        clientsClaim: true,           // Service worker mpya inachukua control mara moja
        maximumFileSizeToCacheInBytes: 6000000,
        runtimeCaching: [
          {
            // Example for caching your API (replace with your API domain)
            urlPattern: /^https:\/\/hardware.shibix-net\.com\/.*$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60, // 1 min
              },
            },
          },
        ],
      },

      // PWA manifest
      manifest: {
        name: "Hardware App",
        short_name: "Hardware App",
        theme_color: "#10B981",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
