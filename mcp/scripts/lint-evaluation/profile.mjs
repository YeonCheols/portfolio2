export const coreRules = {
  "constructor-super": "error",
  "getter-return": "error",
  "no-async-promise-executor": "error",
  "no-compare-neg-zero": "error",
  "no-constant-binary-expression": "error",
  "no-debugger": "error",
  "no-dupe-else-if": "error",
  "no-dupe-keys": "error",
  "no-loss-of-precision": "error",
  "no-sparse-arrays": "error",
  "no-unreachable": "error",
  "no-unsafe-finally": "error",
  "no-unsafe-optional-chaining": "error",
  "use-isnan": "error",
  "valid-typeof": "error",
};

export const consoleRules = {
  "react/jsx-key": "error",
  "react/jsx-no-duplicate-props": "error",
  "react/no-children-prop": "error",
  "react/no-danger-with-children": "error",
  "react/no-deprecated": "error",
  "react/require-render-return": "error",
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",
  "jsx-a11y/alt-text": "warn",
  "jsx-a11y/aria-props": "warn",
  "jsx-a11y/role-supports-aria-props": "warn",
};

export const legacyRules = [
  "react/no-deprecated",
  "react/require-render-return",
];

export const oxlintConfig = (hybrid) => ({
  plugins: ["react", "jsx-a11y"],
  categories: { correctness: "off" },
  ignorePatterns: ["**/dist/**", "coverage/**", "node_modules/**"],
  env: { node: true },
  settings: { react: { version: "18.3.1" } },
  rules: coreRules,
  overrides: [
    {
      files: ["apps/console/src/**/*.ts", "apps/console/src/**/*.tsx"],
      env: { browser: true },
      ...(hybrid
        ? {
            jsPlugins: [{ name: "react-js", specifier: "eslint-plugin-react" }],
          }
        : {}),
      rules: Object.fromEntries(
        Object.entries(consoleRules)
          .filter(([key]) => hybrid || !legacyRules.includes(key))
          .map(([key, value]) => [
            legacyRules.includes(key)
              ? key.replace("react/", "react-js/")
              : key.replace("react-hooks/", "react/"),
            value,
          ]),
      ),
    },
  ],
});
