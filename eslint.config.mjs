import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // Keep last: turns off stylistic rules that Prettier owns.
  prettier,
  globalIgnores([
    ".next/**",
    "**/.next/**",
    ".claude/**",
    "out/**",
    "build/**",
    "coverage/**",
    "cache/**",
    "broadcast/**",
    // Foundry's vendored forge-std lives at the repo-root lib/. src/lib/ is real app code.
    "lib/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
