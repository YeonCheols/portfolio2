const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^~/(.*)$": "<rootDir>/public/$1",
    "^@yeoncheols/portfolio-core-ui$":
      "<rootDir>/src/test/portfolio-core-ui.tsx",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(react-markdown|rehype-slug|remark-gfm|vfile|vfile-message|unist-.*|unified|bail|is-plain-obj|trough|remark-.*|mdast-util-.*|micromark.*|decode-named-character-reference|character-entities|property-information|hast-util-.*|space-separated-tokens|comma-separated-tokens|html-url-attributes|estree-util-is-identifier-name|devlop|zwitch|longest-streak|stringify-entities|ccount|escape-string-regexp|markdown-table|trim-lines|style-to-object|style-to-js|extend)/)",
  ],
  testPathIgnorePatterns: ["<rootDir>/tests/integration/"],
};

module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)();
  jestConfig.testPathIgnorePatterns = [
    ...(jestConfig.testPathIgnorePatterns ?? []),
    "<rootDir>/tests/integration/",
  ];
  jestConfig.transformIgnorePatterns = [
    "/node_modules/(?!(react-markdown|rehype-slug|remark-gfm|vfile|vfile-message|unist-.*|unified|bail|is-plain-obj|trough|remark-.*|mdast-util-.*|micromark.*|decode-named-character-reference|character-entities|property-information|hast-util-.*|space-separated-tokens|comma-separated-tokens|html-url-attributes|estree-util-is-identifier-name|devlop|zwitch|longest-streak|stringify-entities|ccount|escape-string-regexp|markdown-table|trim-lines|style-to-object|style-to-js|extend)/)",
  ];
  return jestConfig;
};
