import winston from 'winston'; // npm install winston

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Write all errors to a file
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // If we're not in production, log to the console as well
    ...(process.env.NODE_ENV !== 'production' 
      ? [new winston.transports.Console()] 
      : [])
  ]
});

export function logError(error: Error, context?: any) {
  logger.error({
    message: error.message,
    stack: error.stack,
    context: context
  });
}