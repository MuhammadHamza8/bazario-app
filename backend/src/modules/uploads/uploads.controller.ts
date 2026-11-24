import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError';

/**
 * POST /api/v1/uploads/images  (multipart/form-data, field name: "images")
 * Multer has already saved the files. We just return their public URLs,
 * which the app then sends when creating a listing.
 */
export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError('No images received', 400);

  const urls = files.map((f) => `/uploads/${f.filename}`);
  res.status(201).json({ success: true, data: { urls } });
}
