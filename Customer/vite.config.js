import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
export default defineConfig(({ mode }) => ({
  define: {
    __CMS_MOCK__: JSON.stringify(
      (process.env.VITE_USE_MOCK ??
        loadEnv(mode, process.cwd()).VITE_USE_MOCK) === "true",
    ),
  },
  cacheDir: `node_modules/.vite-${mode}`,
  optimizeDeps: { entries: ["index.html"] },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  server: { port: 5173 },
  build: { sourcemap: false },
}));
