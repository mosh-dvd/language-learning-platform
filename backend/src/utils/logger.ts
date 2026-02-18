import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about our colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define format for console output (development)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define which transports the logger must use
const transports = [
  // Console transport for all environments
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? format : consoleFormat,
  }),
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format,
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logApiRequest = (method: string, path: string, userId?: string, duration?: number) => {
  logger.http('API Request', {
    method,
    path,
    userId,
    duration,
  });
};

export const logApiError = (method: string, path: string, error: Error, userId?: string) => {
  logger.error('API Error', {
    method,
    path,
    userId,
    error: error.message,
    stack: error.stack,
  });
};

export const logTTSUsage = (
  text: string,
  languageCode: string,
  provider: string,
  cached: boolean,
  userId?: string
) => {
  logger.info('TTS Usage', {
    textLength: text.length,
    languageCode,
    provider,
    cached,
    userId,
  });
};

export const logSTTUsage = (
  recognizedText: string,
  languageCode: string,
  provider: string,
  confidence: number,
  userId?: string
) => {
  logger.info('STT Usage', {
    textLength: recognizedText.length,
    languageCode,
    provider,
    confidence,
    userId,
  });
};

export const logAuthEvent = (
  event: 'register' | 'login' | 'logout' | 'password_reset' | 'oauth',
  userId?: string,
  provider?: string,
  success: boolean = true,
  error?: string
) => {
  logger.info('Auth Event', {
    event,
    userId,
    provider,
    success,
    error,
  });
};

export const logDatabaseQuery = (query: string, duration: number, error?: Error) => {
  if (error) {
    logger.error('Database Query Error', {
      query: query.substring(0, 100), // Truncate long queries
      duration,
      error: error.message,
    });
  } else {
    logger.debug('Database Query', {
      query: query.substring(0, 100),
      duration,
    });
  }
};

export const logCacheOperation = (
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  ttl?: number
) => {
  logger.debug('Cache Operation', {
    operation,
    key,
    ttl,
  });
};

export const logFileOperation = (
  operation: 'upload' | 'download' | 'delete',
  filename: string,
  size?: number,
  userId?: string,
  error?: Error
) => {
  if (error) {
    logger.error('File Operation Error', {
      operation,
      filename,
      size,
      userId,
      error: error.message,
    });
  } else {
    logger.info('File Operation', {
      operation,
      filename,
      size,
      userId,
    });
  }
};

export default logger;
