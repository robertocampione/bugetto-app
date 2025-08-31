import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "127.0.0.1",     // forza IPv4
    port: 5173,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",   // forza anche l’HMR su IPv4
      protocol: "ws",
      port: 5173,
    },
  },
})
