import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { AppError } from '../../utils/AppError';

/** Folder where images are saved on this machine. */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const MAX_IMAGES = 8; // "Add photos 0 / 8" in the design
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image

// Allowed types and the extension we choose for each.
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Multer reads multipart/form-data (file uploads), which express.json() cannot.
 * diskStorage writes each file straight to UPLOAD_DIR.
 *
 * We IGNORE the original file name (users control it and could send
 * "../../evil.js") and generate a random one instead.
 */
export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      cb(null, crypto.randomBytes(16).toString('hex') + EXTENSIONS[file.mimetype]);
    },
  }),
  limits: { fileSize: MAX_SIZE_BYTES, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    // Note: mimetype comes from the client. Good enough for learning;
    // production apps also inspect the file's real bytes.
    if (EXTENSIONS[file.mimetype]) cb(null, true);
    else cb(new AppError('Only JPG, PNG or WebP images are allowed', 400));
  },
});
