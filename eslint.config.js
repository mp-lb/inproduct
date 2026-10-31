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
  // Published storage output runs directly in Node ESM and needs file extensions.
  {
    files: ["packages/scripts/**/*.ts"],
    languageOptions: { parserOptions: { project: "./packages/scripts/tsconfig.json", tsconfigRootDir: import.meta.dirname } },
  },
  {
    files: ["apps/docs/scripts/**/*.ts", "tests/docs/**/*.ts"],
    languageOptions: { parserOptions: { project: "./apps/docs/tsconfig.scripts.json", tsconfigRootDir: import.meta.dirname } },
  },
  {
    files: ["packages/storage/src/**/*.ts", "packages/data-jobs/src/**/*.ts"],
    ignores: ["packages/storage/src/**/*.test.ts", "packages/data-jobs/src/**/tests/**"],
    rules: {
      "import/extensions": ["error", "ignorePackages", { js: "always" }],
    },
  },
];
