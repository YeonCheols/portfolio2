import { describe, expect, it } from "vitest";

import { formatResultText } from "./format-result";

describe("formatResultText", () => {
  it("JSON 객체와 배열은 2칸 들여쓰기로 정렬하고 한글은 그대로 둔다", () => {
    expect(formatResultText('{"a":1,"b":[1,2],"c":"한글"}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ],\n  "c": "한글"\n}',
    );
    expect(formatResultText('[{"id":"x"}]')).toBe(
      '[\n  {\n    "id": "x"\n  }\n]',
    );
  });

  it("앞뒤 공백이 있는 JSON도 정렬한다", () => {
    expect(formatResultText('  \n{"a":1}\n ')).toBe('{\n  "a": 1\n}');
  });

  it("JSON이 아니거나 단순 값인 텍스트는 바꾸지 않는다", () => {
    for (const text of [
      "resume-test",
      "CONNECTION_FAILED",
      "기본형 profile 홍길동",
      "123",
      "true",
      "null",
      '"문자열"',
      '{"깨진": ',
      "",
    ])
      expect(formatResultText(text)).toBe(text);
  });
});
