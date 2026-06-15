import 'dotenv/config';
import { createApp, shutdownGracefully } from './app';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';

const PORT = Number(process.env.PORT) || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(PORT, () => {
    logger.info(`commerce-identity listening on :${PORT} (env=${NODE_ENV})`);
  });

  const handleSignal = (sig: string) => {
    logger.info(`Received ${sig}`);
    shutdownGracefully(server);
  };
  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err: err.message, stack: err.stack });
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', { err: err.message, stack: err.stack });
  process.exit(1);
});
