import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config/env';
import apiRouter from './server/routes/index';
import { requestLogger } from './server/middleware/logger.middleware';
import { errorHandler, notFoundHandler } from './server/middleware/error.middleware';
import { logger } from './server/utils/logger.util';

async function startServer() {
  const app = express();
  const PORT = config.PORT;

  // Basic security & parsing middlewares
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP Request Logger
  app.use(requestLogger);

  // Mount Core Backend API Routes
  app.use('/api', apiRouter);

  // Handle Vite middleware for local development / container lifecycle
  if (process.env.NODE_ENV !== 'production') {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err: any) {
      logger.warn('Vite middleware initialization skipped or running headless:', err.message);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      // If it's an API request that wasn't matched, delegate to notFoundHandler
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // API 404 & Centralized Error Handler
  app.use('/api/*', notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`=======================================================`);
    logger.info(`EduFIN Backend Services initialized and running.`);
    logger.info(`Listening on: http://0.0.0.0:${PORT}`);
    logger.info(`Health Endpoint: http://localhost:${PORT}/api/health`);
    logger.info(`Version Endpoint: http://localhost:${PORT}/api/version`);
    logger.info(`API Directory:   http://localhost:${PORT}/api/docs`);
    logger.info(`Environment:     ${config.NODE_ENV}`);
    logger.info(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting EduFIN backend server:', err);
  process.exit(1);
});
