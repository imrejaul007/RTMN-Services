/**
 * PolicyOS - Safe Expression Evaluator
 *
 * Replaces `new Function('with(context){return ('+expr+')'})` which allowed
 * arbitrary code execution. This module parses a restricted boolean
 * expression grammar and evaluates it against a context object without
 * ever calling `eval`, `new Function`, `with`, or dynamic property access
 * beyond whitelisted dot-paths.
 *
 * Grammar (informal):
 *   expr     := orExpr
 *   orExpr   := andExpr ('||' andExpr)*
 *   andExpr  := unary ('&&' unary)*
 *   unary    := '!' unary | primary
 *   primary  := '(' expr ')' | comparison
 *   comparison := value (op value)?
 *   op       := '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | '!in' | 'contains'
 *   value    := literal | path
 *   path     := IDENT ('.' IDENT | '[' INT ']')*     (e.g. context.user.id, items[0])
 *   literal  := STRING | NUMBER | 'true' | 'false' | 'null'
 *
 * The evaluator is intentionally minimal. It does NOT support:
 *   - Arithmetic (+, -, *, /)
 *   - Function calls of any kind
 *   - String concatenation
 *   - Property access on objects that aren't context or user
 *
 * If the expression can't be parsed, it evaluates to `false` and the caller
 * is expected to fail-closed.
 */

const TOKEN_REGEX = /(=>|==|!=|>=|<=|>|<|&&|\|\||!|\(|\)|\[|\]|\.|,|:|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\d+(?:\.\d+)?|\btrue\b|\bfalse\b|\bnull\b|\bin\b|\bcontains\b|\bcontext\b|\buser\b|[A-Za-z_][A-Za-z0-9_]*)/y;

const SINGLE_OPS = new Set(['>', '<', '>=', '<=', '==', '!=']);
const COMPARE_OPS = new Set(['==', '!=', '>', '<', '>=', '<=']);
const KEYWORDS = new Set(['true', 'false', 'null', 'in', 'contains', 'context', 'user']);

/**
 * Tokenize a string. Throws on unrecognized characters.
 */
function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    // Skip whitespace
    while (i < input.length && /\s/.test(input[i])) i++;
    if (i >= input.length) break;
    TOKEN_REGEX.lastIndex = i;
    const match = TOKEN_REGEX.exec(input);
    if (!match || match.index !== i) {
      throw new Error(`Unexpected character at position ${i}: ${JSON.stringify(input.slice(i, i + 20))}`);
    }
    const text = match[0];
    i += text.length;
    // Keep commas as OP tokens (needed for array literals)
    if (text.startsWith("'") || text.startsWith('"')) {
      tokens.push({ type: 'STRING', value: text.slice(1, -1) });
    } else if (/^\d/.test(text)) {
      tokens.push({ type: 'NUMBER', value: parseFloat(text) });
    } else if (text === 'true' || text === 'false' || text === 'null' || text === 'in' || text === 'contains') {
      tokens.push({ type: 'KEYWORD', value: text });
    } else if (text === 'context' || text === 'user') {
      tokens.push({ type: 'IDENT', value: text });
    } else if (/^[A-Za-z_]/.test(text)) {
      tokens.push({ type: 'IDENT', value: text });
    } else {
      tokens.push({ type: 'OP', value: text });
    }
  }
  return tokens;
}

/**
 * Recursive-descent parser. Returns an AST node.
 */
function parse(tokens) {
  let pos = 0;

  function peek(offset = 0) { return tokens[pos + offset]; }
  function consume(type, value) {
    const t = tokens[pos];
    if (!t) throw new Error(`Unexpected end of expression, expected ${value || type}`);
    if (type && t.type !== type) throw new Error(`Expected ${type} at position ${pos}, got ${JSON.stringify(t)}`);
    if (value !== undefined && t.value !== value) throw new Error(`Expected ${value} at position ${pos}, got ${JSON.stringify(t.value)}`);
    pos++;
    return t;
  }
  function matchOp(...ops) {
    const t = tokens[pos];
    if (t && t.type === 'OP' && ops.includes(t.value)) {
      pos++;
      return t;
    }
    return null;
  }

  function parseExpr() { return parseOr(); }

  function parseOr() {
    let left = parseAnd();
    while (matchOp('||')) {
      const right = parseAnd();
      left = { type: 'OR', left, right };
    }
    return left;
  }

  function parseAnd() {
    let left = parseUnary();
    while (matchOp('&&')) {
      const right = parseUnary();
      left = { type: 'AND', left, right };
    }
    return left;
  }

  function parseUnary() {
    if (matchOp('!')) {
      return { type: 'NOT', expr: parseUnary() };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    if (matchOp('(')) {
      const expr = parseExpr();
      consume('OP', ')');
      return expr;
    }
    return parseComparison();
  }

  function parseComparison() {
    const left = parseValue();
    const op = tokens[pos];
    if (op && op.type === 'OP' && COMPARE_OPS.has(op.value)) {
      pos++;
      const right = parseValue();
      return { type: 'CMP', op: op.value, left, right };
    }
    if (op && op.type === 'KEYWORD' && (op.value === 'in' || op.value === 'contains')) {
      pos++;
      const right = parseValue();
      return { type: 'CMP', op: op.value === 'in' ? 'in' : 'contains', left, right };
    }
    // Bare value — truthiness check
    return { type: 'TRUTHY', value: left };
  }

  function parseValue() {
    const t = tokens[pos];
    if (!t) throw new Error('Unexpected end of expression');
    if (t.type === 'STRING' || t.type === 'NUMBER') { pos++; return { type: 'LIT', value: t.value }; }
    if (t.type === 'KEYWORD' && t.value === 'true')  { pos++; return { type: 'LIT', value: true }; }
    if (t.type === 'KEYWORD' && t.value === 'false') { pos++; return { type: 'LIT', value: false }; }
    if (t.type === 'KEYWORD' && t.value === 'null')  { pos++; return { type: 'LIT', value: null }; }
    // Array literal: [a, b, c]
    if (t.type === 'OP' && t.value === '[') {
      pos++; // consume [
      const elements = [];
      if (!(tokens[pos] && tokens[pos].type === 'OP' && tokens[pos].value === ']')) {
        elements.push(parseValue());
        while (tokens[pos] && tokens[pos].type === 'OP' && tokens[pos].value === ',') {
          pos++;
          elements.push(parseValue());
        }
      }
      if (!(tokens[pos] && tokens[pos].type === 'OP' && tokens[pos].value === ']')) {
        throw new Error(`Expected ] at position ${pos}, got ${JSON.stringify(tokens[pos])}`);
      }
      pos++; // consume ]
      return { type: 'ARRAY', elements };
    }
    if (t.type === 'IDENT')  { return parsePath(); }
    throw new Error(`Unexpected token at position ${pos}: ${JSON.stringify(t)}`);
  }

  function parsePath() {
    // Must start with `context.` or `user.` — never bare identifiers
    const first = consume('IDENT');
    if (first.value !== 'context' && first.value !== 'user') {
      throw new Error(`Path must start with 'context.' or 'user.', got '${first.value}'`);
    }
    const parts = [first.value];
    while (true) {
      if (matchOp('.')) {
        const next = consume('IDENT');
        // Block access to dangerous prototype properties
        const blocked = ['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 'toString', 'valueOf', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'];
        if (blocked.includes(next.value)) {
          throw new Error(`Access to property '${next.value}' is not allowed`);
        }
        parts.push(next.value);
      } else if (matchOp('[')) {
        const idx = consume('NUMBER');
        consume('OP', ']');
        parts.push(String(idx.value));
      } else {
        break;
      }
    }
    return { type: 'PATH', parts };
  }

  const ast = parseExpr();
  if (pos !== tokens.length) {
    throw new Error(`Unexpected trailing tokens at position ${pos}: ${JSON.stringify(tokens[pos])}`);
  }
  return ast;
}

/**
 * Walk an AST and resolve a path node against the given root object.
 * Strict — never falls through to globalThis or any other scope.
 */
function resolvePath(node, context, user) {
  const root = node.parts[0] === 'context' ? context : node.parts[0] === 'user' ? user : null;
  if (root === null) return undefined;
  let cur = root;
  for (let i = 1; i < node.parts.length; i++) {
    if (cur == null) return undefined;
    const part = node.parts[i];
    // Defense in depth: never traverse prototype chain
    if (typeof part === 'string' && (part === '__proto__' || part === 'constructor' || part === 'prototype')) {
      return undefined;
    }
    cur = cur[part];
  }
  return cur;
}

function evalNode(node, context, user) {
  switch (node.type) {
    case 'LIT': return node.value;
    case 'ARRAY': return node.elements.map(e => evalNode(e, context, user));
    case 'PATH': return resolvePath(node, context, user);
    case 'TRUTHY': return !!evalNode(node.value, context, user);
    case 'NOT': return !evalNode(node.expr, context, user);
    case 'AND': return !!evalNode(node.left, context, user) && !!evalNode(node.right, context, user);
    case 'OR':  return !!evalNode(node.left, context, user) || !!evalNode(node.right, context, user);
    case 'CMP': {
      const left = evalNode(node.left, context, user);
      const right = evalNode(node.right, context, user);
      switch (node.op) {
        case '==': return left === right;
        case '!=': return left !== right;
        case '>':  return typeof left === 'number' && typeof right === 'number' && left > right;
        case '<':  return typeof left === 'number' && typeof right === 'number' && left < right;
        case '>=': return typeof left === 'number' && typeof right === 'number' && left >= right;
        case '<=': return typeof left === 'number' && typeof right === 'number' && left <= right;
        case 'in': return Array.isArray(right) && right.includes(left);
        case 'contains': return Array.isArray(left) && left.includes(right);
        default: return false;
      }
    }
    default: return undefined;
  }
}

/**
 * Public API: evaluate a restricted expression against a context.
 *
 * @param {string} expression - The expression to evaluate
 * @param {object} context    - The context object (accessed via `context.X`)
 * @param {object} [user]     - The user object (accessed via `user.X`)
 * @returns {boolean}         - True if the expression evaluates truthy
 *
 * Throws if the expression is invalid (caller should fail-closed).
 */
export function safeEval(expression, context, user = {}) {
  if (typeof expression !== 'string') {
    throw new Error('Expression must be a string');
  }
  if (expression.length > 1000) {
    throw new Error('Expression too long (max 1000 chars)');
  }
  const tokens = tokenize(expression);
  const ast = parse(tokens);
  return !!evalNode(ast, context || {}, user || {});
}

/**
 * Validate an expression without evaluating it. Used by policy validation.
 *
 * @param {string} expression
 * @returns {{valid: boolean, error?: string}}
 */
export function validateExpression(expression) {
  if (typeof expression !== 'string') {
    return { valid: false, error: 'Expression must be a string' };
  }
  if (expression.length > 1000) {
    return { valid: false, error: 'Expression too long (max 1000 chars)' };
  }
  try {
    const tokens = tokenize(expression);
    parse(tokens);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

export default { safeEval, validateExpression };
