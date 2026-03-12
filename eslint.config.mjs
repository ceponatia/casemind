import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";

// ---------------------------------------------------------------------------
// Root ESLint config — boundary enforcement + shared rules + type-aware TS.
// Package-specific rules live in per-package eslint.config.mjs files.
// ---------------------------------------------------------------------------

const eslintConfig = defineConfig([
  // ----- Global ignores -----
  globalIgnores([
    "**/node_modules/**",
    "**/coverage/**",
    "**/dist/**",
    "**/.stryker-tmp/**",
    "**/reports/**",
  ]),

  // ----- ESLint recommended rules -----
  js.configs.recommended,

  // ----- TypeScript type-checked rules -----
  ...tseslint.configs.recommendedTypeChecked,

  // TypeScript source files — type-aware parsing
  {
    files: ["**/*.ts", "**/*.mts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
  },

  // JavaScript / MJS config files
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Disable rules that overlap with TypeScript checking
  {
    rules: {
      "no-undef": "off",
      "no-redeclare": "off",
      "no-dupe-class-members": "off",
    },
  },

  // ----- Boundary enforcement (all packages) -----
  {
    plugins: { boundaries },
    settings: {
      // Anchor element resolution to the monorepo root so per-package
      // lint runs (which CWD into packages/*/) still match correctly.
      "boundaries/root-path": import.meta.dirname,

      // Define the architectural elements by filesystem pattern
      "boundaries/elements": [
        { type: "platform-config", pattern: ["packages/platform-config"] },
        { type: "test-utils", pattern: ["packages/test-utils"] },
        { type: "auth", pattern: ["packages/auth"] },
        { type: "db", pattern: ["packages/db"] },
        // Future packages register here:
        // { type: "rbac", pattern: ["packages/rbac"] },
        // { type: "app", pattern: ["apps/*"], capture: ["app"] },
      ],
      "boundaries/dependency-nodes": ["import", "dynamic-import"],
    },
    rules: {
      // ----- Which packages can import which -----
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // db can import platform-config (production) and test-utils (dev)
            { from: "db", allow: ["platform-config", "test-utils"] },
            // auth can import test-utils (dev only)
            { from: "auth", allow: ["test-utils"] },
            // platform-config is a leaf — no cross-package imports
            { from: "platform-config", allow: [] },
            // test-utils is a leaf — no cross-package imports
            { from: "test-utils", allow: [] },
          ],
        },
      ],

      // ----- No reaching into package internals -----
      "boundaries/no-private": ["error"],
    },
  },

  // ----- Shared code quality rules (apply to all packages) -----
  {
    rules: {
      complexity: ["warn", { max: 12 }],
      "max-lines": [
        "warn",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@casemind/*/src/*"],
              message:
                "Do not reach into another package's src/. Import from the package root.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
