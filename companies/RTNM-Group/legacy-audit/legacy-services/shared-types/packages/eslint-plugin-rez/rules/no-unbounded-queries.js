/**
 * ESLint Rule: no-unbounded-queries
 *
 * Catches Prisma/Mongoose queries without pagination or limits.
 *
 * Usage:
 *   const { rules } = require('@rez/eslint-plugin');
 *   module.exports = {
 *     rules: {
 *       '@rez/no-unbounded-queries': 'error'
 *     }
 *   };
 */

'use strict';

/**
 * Check if a Prisma query has pagination (take, skip)
 */
function hasPrismaPagination(node) {
  if (!node || node.type !== 'CallExpression') return false;

  const arguments_ = node.arguments || [];

  // Check for take/skip in arguments
  for (const arg of arguments_) {
    if (arg.type === 'ObjectExpression') {
      for (const prop of arg.properties) {
        if (prop.key?.name === 'take' || prop.key?.name === 'skip') {
          return true;
        }
      }
    }
  }

  // Check for chained .take() or .skip()
  let current = node;
  while (current) {
    if (current.callee?.property?.name === 'take') return true;
    if (current.callee?.property?.name === 'skip') return true;
    current = current.callee?.object;
  }

  return false;
}

/**
 * Check if a Mongoose query has limit
 */
function hasMongooseLimit(node) {
  if (!node || node.type !== 'CallExpression') return false;

  // Check for .limit() in chain
  let current = node;
  while (current) {
    if (current.callee?.property?.name === 'limit') return true;
    current = current.callee?.object;
  }

  // Check for .find({...}, { limit: X })
  const arguments_ = node.arguments || [];
  for (const arg of arguments_) {
    if (arg.type === 'ObjectExpression') {
      for (const prop of arg.properties) {
        if (prop.key?.name === 'limit') {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if this is a list query (not a findOne or count)
 */
function isListQuery(node) {
  if (!node || node.type !== 'CallExpression') return false;

  const calleeName = node.callee?.property?.name || node.callee?.name || '';

  // These are NOT list queries
  const nonListMethods = [
    'findOne',
    'findById',
    'findOneAndUpdate',
    'findOneAndDelete',
    'count',
    'countDocuments',
    'estimatedDocumentCount',
    'exists',
    'lean',
    'exec',
  ];

  // These ARE list queries
  const listMethods = [
    'find',
    'findAll',
  ];

  return listMethods.includes(calleeName);
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unbounded queries without pagination',
      category: 'Performance',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          maxLimit: {
            type: 'number',
            default: 1000,
          },
          defaultLimit: {
            type: 'number',
            default: 20,
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const defaultLimit = options.defaultLimit || 20;

    return {
      // Prisma: Model.findMany()
      CallExpression(node) {
        const calleeName = node.callee?.property?.name;

        // Check for Prisma findMany
        if (calleeName === 'findMany' || calleeName === 'findFirst') {
          if (calleeName === 'findMany' && !hasPrismaPagination(node)) {
            context.report({
              node,
              message: `Unbounded Prisma query. Use take() and skip() for pagination. Example: .findMany({ take: ${defaultLimit}, skip: 0 })`,
            });
          }
        }

        // Check for Mongoose find()
        if (calleeName === 'find' && !hasMongooseLimit(node)) {
          // Check if it's a count or exists call
          const parent = node.parent;
          if (parent?.callee?.property?.name !== 'count') {
            context.report({
              node,
              message: `Unbounded Mongoose query. Use .limit() for pagination. Example: .limit(${defaultLimit})`,
            });
          }
        }
      },
    };
  },
};
