import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inline the built CSS into <head>. Tailwind output is ~80 KB raw / ~14 KB
// gzip — small enough to embed rather than ship as a separate render-blocking
// <link rel="stylesheet">. Saves ~1.3 s on slow-4G LCP per Lighthouse.
//
// Uses Vite's `transformIndexHtml` hook (not the lower-level Rollup
// `generateBundle`) so it runs at the right point in Vite's HTML pipeline
// regardless of plugin ordering or Vite version. The earlier `generateBundle`
// implementation worked locally but silently no-op'd on Vercel's build,
// shipping a non-inlined HTML to production.
function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        return html.replace(
          /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+\.css)["'][^>]*>/g,
          (match, hrefAttr: string) => {
            // ctx.bundle keys are bundle-relative; the href has a leading slash
            // and may include the assets dir. Try both forms to match.
            const stripped = hrefAttr.replace(/^\//, '');
            const cssAsset = ctx.bundle![stripped] || ctx.bundle![hrefAttr];
            if (!cssAsset || cssAsset.type !== 'asset') return match;
            const css =
              typeof cssAsset.source === 'string'
                ? cssAsset.source
                : new TextDecoder().decode(cssAsset.source);
            return `<style>${css}</style>`;
          },
        );
      },
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
