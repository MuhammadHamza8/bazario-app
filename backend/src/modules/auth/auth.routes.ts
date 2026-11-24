import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './auth.controller';
import { forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema } from './auth.schema';

/**
 * Each line reads left to right as the request pipeline:
 * [validate input] -> [controller]. Mounted at /api/v1/auth.
 */
const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(controller.register));
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.post('/refresh', validate(refreshSchema), asyncHandler(controller.refresh));
router.post('/logout', validate(refreshSchema), asyncHandler(controller.logout));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(controller.forgotPassword));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(controller.resetPassword));
router.get('/me', authenticate, asyncHandler(controller.me));

export default router;
