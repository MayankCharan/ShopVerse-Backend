const winston = require("winston");

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const logData = {
    timestamp,
    level,
    message,
    ...meta,
  };

  // Include stack trace for errors
  if (stack) {
    logData.stack = stack;
  }

  return JSON.stringify(logData);
});

// Console format for development
const consoleFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}${stack ? `\n${stack}` : ""}`;
  }),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), errors({ stack: true }), logFormat),
  defaultMeta: {
    service: "shopverse-api",
  },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 30,
      tailable: true,
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 30,
      tailable: true,
    }),
    // Write security events to security.log
    new winston.transports.File({
      filename: "logs/security.log",
      level: "warn",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 90, // Keep security logs longer
      tailable: true,
    }),
  ],
  // Handle transport errors
  exitOnError: false,
});

// Add console transport in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

module.exports = logger;
