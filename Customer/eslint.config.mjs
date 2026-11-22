import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default [
  {
    ignores: [
      'dist/**',
      'artifacts/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        __CMS_MOCK__: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': hooks },
    rules: { 'no-unused-vars': 'off', 'react-hooks/rules-of-hooks': 'error' },
  },
];
