/**
 * local server entry file, for local development
 */
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('FATAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
