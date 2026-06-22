import logger from './utils/logger';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { calculateSupplierScore, runMonthlyScoring, SupplierScore } from './calculator';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

/**
 * Create Supabase client with service role key
 */
function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * CLI runner for the scoring engine
 */
async function main(): Promise<void> {
  logger.info('Starting Scoring Engine...');
  logger.info(`Timestamp: ${new Date().toISOString()}`);

  const supabase = createSupabaseClient();

  try {
    const result = await runMonthlyScoring(supabase);
    logger.info(`\nScoring Engine completed successfully:`);
    logger.info(`  - Suppliers scored: ${result.scored}`);
  } catch (error) {
    logger.error('Scoring Engine failed:', error);
    process.exit(1);
  }

  logger.info('Scoring Engine exiting...');
}

// Run if executed directly
if (require.main === module) {
  main().catch((err) => {
    logger.error('Unhandled error:', err);
    process.exit(1);
  });
}

// Export for use as a module
export { createSupabaseClient, main };
export { calculateSupplierScore, runMonthlyScoring };
export type { SupplierScore } from './calculator';
