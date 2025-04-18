module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["add", "modify", "fix", "docs", "refactor", "test", "revert"],
    ],
  },
};
