module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  ignorePatterns: ["node_modules", "dist", "*.d.ts"],
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    "@typescript-eslint/no-use-before-define": ["error", { "functions": false, "classes": false }],
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-unused-vars": "error",
  }
};
