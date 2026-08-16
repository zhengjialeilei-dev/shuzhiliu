import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  assetsInlineLimit: () => true,
  server: { host: "127.0.0.1" },
});
