import { Router } from 'express';
import mongoose from 'mongoose';
import { cacheStatus } from '../utils/cache';

const router = Router();

/**
 * GET /api/v1/health
 * Quick check that the server and database are alive.
 * readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
router.get('/', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    uptimeSeconds: Math.round(process.uptime()),
    database: dbConnected ? 'connected' : 'disconnected',
    cache: cacheStatus(), // optional, so it never affects `success`
  });
});

export default router;
