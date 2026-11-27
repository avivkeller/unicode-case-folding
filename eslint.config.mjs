import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  globalIgnores(["**/dist/"]),
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
  {
    files: ["packages/*/*/template.mjs", "packages/internal/helpers/src/**"],
    languageOptions: {
      globals: globals.es2025,
    },
  },
]);
