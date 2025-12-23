import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Express } from 'express';
import { connectDatabase, initializeDatabase, seedData, closeDatabase } from './db/database';
import reservationsRouter from './routes/reservations';
import { errorHandler, notFoundHandler } from './middleware/validation';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/reservations', reservationsRouter);

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize and start server
async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await initializeDatabase();
    await seedData();
    const server = app.listen(PORT, () => {
      console.log(`TicketBoss API server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} signal received: closing HTTP server`);
      server.close(async () => {
        console.log('HTTP server closed');
        await closeDatabase();
        process.exit(0);
      });
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
