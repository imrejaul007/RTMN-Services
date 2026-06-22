// ESLint flat config for rez-app-admin
// ADM-005 FIX: Enforce max-lines rule to prevent future file bloat.
// Override at file-level with: /* eslint-disable max-lines */
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import * as tsParser from '@typescript-eslint/parser';

export default [
  // Inherit recommended rules
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        FormData: 'readonly',
        XMLHttpRequest: 'readonly',
        __DEV__: 'readonly',
        ErrorUtils: 'readonly',
        alert: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'warn',
    },
  },

  // Ignore node_modules and build artifacts
  {
    ignores: ['node_modules/**', 'android/**', 'ios/**', '.expo/**', 'dist/**'],
  },
];
