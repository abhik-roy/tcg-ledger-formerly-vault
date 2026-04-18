import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Utility scripts are not application code — skip linting
    "scripts/**",
    // Shelved shop/stripe/pos code — excluded from lint
    "src/_shelved/**",
  ]),
  {
    rules: {
      // Allow console.error and console.warn; flag bare console.log
      "no-console": ["warn", { allow: ["error", "warn"] }],
      // The set-state-in-effect rule fires on legitimate hydration-guard patterns
      // (e.g. useEffect(() => setMounted(true), [])). Downgrade to warn so the
      // pattern remains visible without blocking CI.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
