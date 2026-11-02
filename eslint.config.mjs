import { FlatCompat } from "@eslint/eslintrc";
import next from "eslint-config-next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

export default [
  ...next,
  ...compat.extends(
    "@feature-sliced/eslint-config/rules/import-order",
    "@feature-sliced/eslint-config/rules/layers-slices",
  ),
  {
    rules: {
      "import/no-internal-modules": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
];
