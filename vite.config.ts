import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
