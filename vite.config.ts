import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Ant Design is intentionally bundled as a framework chunk in this console prototype.
    // The default 500 kB warning is too low for this dependency profile, while app code
    // remains split from React, AntD and Dayjs for stable browser caching.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/")) {
            return "vendor-react";
          }

          if (id.includes("/node_modules/dayjs/")) {
            return "vendor-dayjs";
          }

          if (id.includes("/node_modules/antd/") || id.includes("/node_modules/@ant-design/")) {
            return "vendor-antd";
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
