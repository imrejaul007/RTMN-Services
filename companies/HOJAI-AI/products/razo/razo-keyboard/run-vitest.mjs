// Direct vitest programmatic runner
import { runVitest } from 'vitest/node';
process.exit(await runVitest({
  include: ['__tests__/**/*.test.{js,mjs}'],
  globals: true,
  environment: 'node',
}));
