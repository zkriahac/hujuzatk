import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inline the entire built CSS into <head>. Tailwind output is ~80 KB raw
// (~14 KB gzip) — small enough to embed rather than ship as a separate
// render-blocking <link rel="stylesheet">. Saves ~1.3 s on slow-4G LCP
// per Lighthouse's "Render-blocking requests" diagnostic. Still leaves
// the CSS file in dist for any external referrer; we just remove its
// <link> tag from index.html.
function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const indexAsset = Object.values(bundle).find(
        (a) => a.type === 'asset' && a.fileName === 'index.html',
      ) as { type: 'asset'; fileName: string; source: string | Uint8Array } | undefined;
      if (!indexAsset) return;
      let html =
        typeof indexAsset.source === 'string'
          ? indexAsset.source
          : new TextDecoder().decode(indexAsset.source);

      // Find each `<link rel="stylesheet" ... href="/assets/index-XXXX.css">`
      // and replace it with an inline <style>...</style> block.
      html = html.replace(
        /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+\.css)["'][^>]*>/g,
        (_match, hrefAttr: string) => {
          const fileName = hrefAttr.replace(/^\//, '');
          const cssAsset = bundle[fileName];
          if (!cssAsset || cssAsset.type !== 'asset') return _match;
          const css =
            typeof cssAsset.source === 'string'
              ? cssAsset.source
              : new TextDecoder().decode(cssAsset.source);
          return `<style>${css}</style>`;
        },
      );

      indexAsset.source = html;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), inlineCss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Conservative manualChunks — only split what's a clean leaf in the dep
    // graph. Aggressive splitting (separating Apollo / framer / dexie from
    // their tslib + @wry helpers) broke runtime with
    //   "Class extends value undefined is not a constructor"
    // because the base class lived in one chunk and the subclass tried to
    // extend it before the base loaded. React itself + phosphor icons + xlsx
    // are safe — no class extension chains across packages.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.match(/[/\\]react[/\\]|[/\\]react-dom[/\\]|[/\\]scheduler[/\\]|[/\\]react-router[/\\]|[/\\]react-router-dom[/\\]/)) {
            return 'vendor-react';
          }
          if (id.includes('phosphor-react')) return 'vendor-icons';
          if (id.includes('/xlsx/'))         return 'vendor-xlsx';
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
