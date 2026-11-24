import app from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { disconnectCache } from './utils/cache';

/**
 * Entry point: connect to the database FIRST, then start listening.
 * (No point accepting requests if we cannot reach the database.)
 */
async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown: stop accepting requests, close the DB, then exit.
  // Triggered by Ctrl+C (SIGINT) or a deploy/restart (SIGTERM).
  const shutdown = () => {
    console.log('Shutting down...');
    server.close(async () => {
      await disconnectDB();
      await disconnectCache();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
