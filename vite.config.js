import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two pages: the intro at / and the tool at /lab/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        lab: resolve(import.meta.dirname, "lab/index.html"),
      },
    },
  },
});
