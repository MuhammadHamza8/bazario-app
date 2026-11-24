import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uploadImages } from './uploads.controller';
import { MAX_IMAGES, upload } from './upload.middleware';

const router = Router();

// ORDER MATTERS: authenticate runs BEFORE multer, so anonymous users
// cannot write files to our disk.
router.post('/images', authenticate, upload.array('images', MAX_IMAGES), asyncHandler(uploadImages));

export default router;
