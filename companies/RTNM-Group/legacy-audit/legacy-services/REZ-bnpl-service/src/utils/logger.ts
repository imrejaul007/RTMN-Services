import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json()
  ),
  defaultMeta: { service: 'rez-bnpl-service' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(json())
        : combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length > 1
                ? ` ${JSON.stringify(meta)}`
                : '';
              return `[${level}] ${message}${metaStr}`;
            })
          ),
    }),
  ],
});

export default logger;
