const config = require("./commitlint.config");

describe("commitlint.config", () => {
  it("커밋 타입과 제목 길이 규칙을 둔다", () => {
    expect(config.extends).toEqual(["@commitlint/config-conventional"]);
    expect(config.rules["type-enum"][2]).toEqual([
      "feat",
      "fix",
      "docs",
      "style",
      "refactor",
      "perf",
      "test",
      "build",
      "ci",
      "chore",
      "revert",
    ]);
    expect(config.rules["type-case"]).toEqual([2, "always", "lower-case"]);
    expect(config.rules["type-empty"]).toEqual([2, "never"]);
    expect(config.rules["subject-empty"]).toEqual([2, "never"]);
    expect(config.rules["subject-case"]).toEqual([2, "always", "lower-case"]);
    expect(config.rules["subject-full-stop"]).toEqual([2, "never", "."]);
    expect(config.rules["subject-max-length"]).toEqual([2, "always", 100]);
    expect(config.rules["body-leading-blank"]).toEqual([2, "always"]);
    expect(config.rules["body-max-line-length"]).toEqual([2, "always", 72]);
    expect(config.rules["footer-leading-blank"]).toEqual([2, "always"]);
    expect(config.rules["footer-max-line-length"]).toEqual([2, "always", 72]);
  });
});
