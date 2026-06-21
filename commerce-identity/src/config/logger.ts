import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'commerce-identity' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1
            ? ` ${JSON.stringify(Object.fromEntries(Object.entries(meta).filter(([k]) => k !== 'service')))}`
            : '';
          return `${timestamp} [${level}] [commerce-identity]: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});
