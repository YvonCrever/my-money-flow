import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function getManualVendorChunk(id: string) {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("/recharts/") || id.includes("/victory-vendor/")) {
    return "vendor-charts";
  }

  if (id.includes("/react-grid-layout/") || id.includes("/react-resizable/")) {
    return "vendor-grid";
  }

  if (id.includes("/html2canvas/") || id.includes("/jspdf/")) {
    return "vendor-export-pdf";
  }

  if (id.includes("/mammoth/")) {
    return "vendor-docx-import";
  }

  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    rollupOptions: {
      output: {
        manualChunks: getManualVendorChunk,
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: [
        '**/imports/**',
        '**/public/imports/**',
        '**/ycaro-backup-latest.json',
        '**/*.pdf',
      ],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
