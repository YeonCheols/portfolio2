import parser from "@typescript-eslint/parser";
import accessibility from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";

import { consoleRules, coreRules } from "./profile.mjs";

export default [
  {
    files: [
      "apps/backend/src/**/*.ts",
      "apps/console/src/**/*.{ts,tsx}",
      "packages/admin-contracts/src/**/*.ts",
    ],
    languageOptions: {
      parser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: coreRules,
  },
  {
    files: ["apps/console/src/**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": hooks, "jsx-a11y": accessibility },
    settings: { react: { version: "18.3.1" } },
    rules: consoleRules,
  },
];
