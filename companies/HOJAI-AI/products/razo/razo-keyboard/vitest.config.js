// vitest.config.js — RAZO Keyboard
module.exports = {
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.{js,mjs}'],
    coverage: { reporter: ['text', 'json'] },
  },
};
