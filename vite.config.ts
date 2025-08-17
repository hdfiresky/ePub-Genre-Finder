import path from "path";
import { VitePWA } from 'vite-plugin-pwa'; 
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "/epub-tagger/",
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "robots.txt",
          "favicon.png",
          "apple-touch-icon.webp",
          "pwa-192x192.webp",
          "pwa-512x512.webp",
        ],
        manifest: {
          name: "Epub Tagger",
          short_name: "Epub Tagger",
          start_url: "/epub-tagger/",
          scope: "/epub-tagger/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#ffffff",
          icons: [
            {
              src: "/epub-tagger/pwa-192x192.webp",
              sizes: "192x192",
              type: "image/webp",
            },
            {
              src: "/epub-tagger/pwa-512x512.webp",
              sizes: "512x512",
              type: "image/webp",
            },
            {
              src: "/epub-tagger/pwa-512x512.webp",
              sizes: "512x512",
              type: "image/webp",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
  };
});
