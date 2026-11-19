import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Same rule set as the old .eslintrc.json ("next/core-web-vitals"), in the
// flat-config format ESLint 9 requires now that `next lint` is gone.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    linterOptions: {
      // `next lint` never reported these; keep lint output comparable.
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      // New in eslint-plugin-react-hooks 7 (React Compiler checks). They were
      // not part of the Next 14 rule set and flag ~118 existing patterns;
      // fixing them means changing component code, which the migration
      // forbids. Revisit after Phase 5.
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // typescript-eslint recommended (Phase 5). These flag existing code that
      // the migration kept exactly as it ran in JavaScript, so they warn for
      // now and get fixed with the bug-register work:
      // - `var` / `let` that could be `const` in the original code
      "no-var": "warn",
      "prefer-const": "warn",
      // - `a?.b!` and `a!?.b` are the migration's type-only casts: the runtime
      //   `?.` stays, the `!` only tells TypeScript the value is there
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-extra-non-null-assertion": "warn",
      // `any` is only allowed through the TODO_TYPE alias (src/types/todo.ts).
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "public/firebase-messaging-sw.js",
    "migration-baseline/**",
    "next-env.d.ts",
  ]),
]);
