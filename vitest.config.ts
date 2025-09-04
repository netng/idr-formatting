import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,       // <-- bikin describe/it/expect jadi global
    environment: "node", // atau "jsdom" jika butuh DOM
    include: ["src/**/*.test.ts"]
  }
})
