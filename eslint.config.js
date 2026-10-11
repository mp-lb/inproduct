import { createBaseEslintConfig } from "@mp-lb/fssstack-config/eslint";

export default [
  { ignores: ["apps/docs/.react-router/**", "apps/docs/.source/**", "apps/docs/build/**"] },
  ...createBaseEslintConfig({
  project: [
    "./apps/**/tsconfig.json",
    "./apps/**/tsconfig.app.json",
    "./packages/**/tsconfig.json",
  ],
  tsconfigRootDir: import.meta.dirname,
}),
];
