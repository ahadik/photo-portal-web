module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended",
  ],
  ignorePatterns: [
    "dist",
    ".eslintrc.cjs",
    "public",
    "functions/**/*", // Functions has its own ESLint config
    "vite.config.ts", // Uses tsconfig.node.json, not included in main tsconfig
    "postcss.config.cjs", // JavaScript config file, not TypeScript
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["react-refresh", "@typescript-eslint"],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_" },
    ],
    "react/react-in-jsx-scope": "off", // Not needed with React 17+ JSX transform
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
