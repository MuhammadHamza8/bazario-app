import { Request, Response } from 'express';
import { cached } from '../../utils/cache';
import { Category } from './category.model';

/** GET /api/v1/categories : public, used by Home, Favourites chips and Create listing. */
export async function listCategories(_req: Request, res: Response) {
  // Categories almost never change and every screen needs them: ideal to cache (10 min).
  const categories = await cached('categories', 600, () =>
    Category.find({ isActive: true }).sort({ order: 1 }).select('-__v').lean(),
  );
  res.json({ success: true, data: { categories } });
}
