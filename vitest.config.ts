import { defineConfig } from "vitest/config"
import { configDefaults } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/tests/setup.ts",
    exclude: [...configDefaults.exclude, "src/_shelved/**"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
