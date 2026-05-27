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
    // Split big vendors into stable cacheable chunks. The landing page only pulls
    // `vendor-react`; everything else is fetched on-demand when the user navigates
    // to a route that needs it (workspace → apollo, expenses/reports → date-fns,
    // export → xlsx). Means a returning visitor doesn't redownload react every
    // time the app code changes.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-router'))                return 'vendor-react';
          if (id.match(/[/\\]react[/\\]|[/\\]react-dom[/\\]|[/\\]scheduler[/\\]/)) return 'vendor-react';
          if (id.includes('@apollo') || id.includes('graphql')) return 'vendor-apollo';
          if (id.includes('phosphor-react'))              return 'vendor-icons';
          if (id.includes('date-fns'))                    return 'vendor-datefns';
          if (id.includes('framer-motion'))               return 'vendor-motion';
          if (id.includes('dexie'))                       return 'vendor-dexie';
          if (id.includes('xlsx'))                        return 'vendor-xlsx';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
