import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 소스 디렉터리만 테스트 대상으로 삼고, tsc 결과물(dist)을 제외해 CJS/ESM 혼선 방지
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["dist", "node_modules"],
  },
});
