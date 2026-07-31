import config from "@chatter/eslint-config";

export default [
  ...config,
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "project/**", "apps/web/next-env.d.ts"],
  },
];
