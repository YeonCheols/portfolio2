import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import { defineConfig } from "vitest/config";

const path = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));

// MCP 서버가 /admin/ai-models/assets/ 아래에서 빌드 산출물을 정적으로 서빙한다
export default defineConfig({
  root: path("."),
  base: "/admin/ai-models/",
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: path("./tailwind.config.js") })],
    },
  },
  build: {
    outDir: path("./dist"),
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/, /packages\/admin-contracts\/dist/],
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
