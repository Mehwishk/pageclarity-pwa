import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// `vite build --mode preview` makes a static preview build (relative paths, no
// service worker) for sharing as a link. The normal build is the installable PWA.
export default defineConfig(({ mode }) => {
  const isPreview = mode === "preview";
  return {
    base: isPreview ? "./" : "/",
    build: isPreview ? { outDir: "preview-dist" } : undefined,
    plugins: [
      react(),
      !isPreview &&
        VitePWA({
          registerType: "autoUpdate",
          includeAssets: ["apple-touch-icon.png", "icon-192.png", "icon-512.png"],
          manifest: {
            name: "PageClarity",
            short_name: "PageClarity",
            description: "Know what's in every book. Content screening for families.",
            start_url: "/",
            scope: "/",
            display: "standalone",
            orientation: "portrait",
            background_color: "#0D1E28",
            theme_color: "#1C7A6E",
            lang: "en",
            icons: [
              { src: "icon-192.png", sizes: "192x192", type: "image/png" },
              { src: "icon-512.png", sizes: "512x512", type: "image/png" },
              { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
            ],
          },
        }),
    ],
  };
});
