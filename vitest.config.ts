import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./packages/nextjs", import.meta.url)),
    },
  },
  test: {
    include: ["packages/nextjs/**/*.test.ts"],
  },
});
