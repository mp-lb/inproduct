import { createBaseEslintConfig } from "@mp-lb/fssstack-config/eslint";

export default [
  {
    ignores: [
      "apps/docs/.react-router/**",
      "apps/docs/.source/**",
      "apps/docs/build/**",
    ],
  },
  ...createBaseEslintConfig({
    project: [
      "./apps/**/tsconfig.json",
      "./apps/**/tsconfig.app.json",
      "./packages/**/tsconfig.json",
    ],
    tsconfigRootDir: import.meta.dirname,
  }),
  // Native Node ESM scripts require explicit .mjs import extensions.
  {
    files: ["scripts/secrets/*.mjs"],
    rules: {
      "import/extensions": ["error", "ignorePackages", { mjs: "always" }],
    },
  },
  // Published storage output runs directly in Node ESM and needs file extensions.
  {
    files: ["packages/storage/src/**/*.ts"],
    ignores: ["packages/storage/src/**/*.test.ts"],
    rules: {
      "import/extensions": ["error", "ignorePackages", { js: "always" }],
    },
  },
];
