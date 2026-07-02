const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const connectDB = require("./src/config/db");
const logger = require("./src/utils/logger");
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  const server = app.get("server");
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
  } else {
    process.exit(1);
  }

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown due to timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", {
    error: err.message,
    stack: err.stack,
  });
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", { error: err.message, stack: err.stack });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`Server is running`);
    });

    // Store server instance for graceful shutdown
    app.set("server", server);

    // Set timeout for requests
    server.timeout = 30000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error("Failed to start server:", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startServer();
