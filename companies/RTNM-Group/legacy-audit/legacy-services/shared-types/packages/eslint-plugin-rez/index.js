/**
 * REZ ESLint Plugin
 *
 * Provides security and performance rules for the REZ codebase.
 *
 * Installation:
 *   npm install --save-dev @rez/eslint-plugin
 *
 * Configuration in .eslintrc.js:
 *   const rez = require('@rez/eslint-plugin');
 *
 *   module.exports = {
 *     plugins: ['@rez'],
 *     rules: {
 *       '@rez/require-validation': 'error',
 *       '@rez/no-unbounded-queries': 'error',
 *     }
 *   };
 */

'use strict';

const requireValidation = require('./rules/require-validation');
const noUnboundedQueries = require('./rules/no-unbounded-queries');

module.exports = {
  rules: {
    '@rez/require-validation': requireValidation,
    '@rez/no-unbounded-queries': noUnboundedQueries,
  },
  configs: {
    recommended: {
      plugins: {
        '@rez': {},
      },
      rules: {
        '@rez/require-validation': 'error',
        '@rez/no-unbounded-queries': 'warn',
      },
    },
  },
};
