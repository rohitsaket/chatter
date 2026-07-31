import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Shared flat ESLint config for all Chatter packages. */
export default tseslint.config(
  { ignores: ["dist/**", ".next/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);
