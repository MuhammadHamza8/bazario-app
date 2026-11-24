import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import categoryRoutes from '../modules/categories/category.routes';
import listingRoutes from '../modules/listings/listing.routes';
import uploadRoutes from '../modules/uploads/uploads.routes';
import healthRoutes from './health.routes';

/**
 * Collects every feature's routes under one router.
 * app.ts mounts this at /api/v1, so "/health" becomes "/api/v1/health".
 * Each new module (auth, listings, ...) gets one line here.
 */
const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/uploads', uploadRoutes);
router.use('/listings', listingRoutes);

export default router;
