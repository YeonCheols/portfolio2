import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// jsdom 환경의 전역 URL은 fs가 받지 않아 경로 문자열로 바꿔서 읽는다
const indexHtml = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../index.html"),
  "utf8",
);

describe("index.html", () => {
  it("같은 출처 POST에 Origin이 가도록 same-origin 리퍼러 정책을 쓴다", () => {
    expect(indexHtml).toContain(
      '<meta name="referrer" content="same-origin" />',
    );
    expect(indexHtml).not.toContain("no-referrer");
  });

  it("CSP script-src 'self'를 지키도록 인라인 스크립트를 두지 않는다", () => {
    expect(indexHtml).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
  });
});
