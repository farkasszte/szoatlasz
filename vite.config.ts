import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Szó Atlasz – Vite beállítás.
 * Alapértelmezett útvonal: /. Alkalmazás-alkönyvtárhoz állítsd a PUBLIC_BASE-t.
 */
export default defineConfig({
  base: process.env.PUBLIC_BASE || "/",
  plugins: [react()],
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  build: { chunkSizeWarningLimit: 600 },
});
