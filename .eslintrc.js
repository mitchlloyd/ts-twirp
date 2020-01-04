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
};
