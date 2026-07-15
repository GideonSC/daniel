import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    proxy: {
      "/summary": "http://127.0.0.1:8002",
      "/predict": "http://127.0.0.1:8002",
      "/health": "http://127.0.0.1:8002",
      "/records": "http://127.0.0.1:8002",
      "/upload-excel": "http://127.0.0.1:8002",
    },
  },
});
