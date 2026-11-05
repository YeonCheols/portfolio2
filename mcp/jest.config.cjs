module.exports = {
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/*.test.ts",
    "<rootDir>/apps/backend/src/**/*.test.ts",
    "<rootDir>/packages/*/src/**/*.test.ts",
  ],
  moduleNameMapper: {
    "^@mcp/(.*)$": "<rootDir>/apps/backend/src/$1",
    "^@portfolio-mcp/admin-contracts$":
      "<rootDir>/packages/admin-contracts/src/index.ts",
  },
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: { parser: { syntax: "typescript" }, target: "es2022" },
        module: { type: "commonjs" },
      },
    ],
  },
  collectCoverageFrom: [
    "apps/backend/src/**/*.ts",
    "packages/*/src/**/*.ts",
    "!**/*.test.ts",
    "!**/testing/**",
  ],
};
