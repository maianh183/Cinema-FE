import js from '@eslint/js';
import globals from 'globals';
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'delivery/**',
      'test-results/**',
      'playwright-report/**',
      'playwright-http-report/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { 'no-unused-vars': 'off', 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
];
