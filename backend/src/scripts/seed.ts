import { connectDB, disconnectDB } from '../config/db';
import { Category } from '../modules/categories/category.model';

/**
 * Fills the database with the categories from the design.
 * Run with: npm run seed   (safe to run many times: it updates instead of duplicating)
 */
const categories = [
  { name: 'Vehicles', slug: 'vehicles', icon: '🚗', color: '#DBEAFE', order: 1 },
  { name: 'Home', slug: 'home', icon: '🏠', color: '#FCE7F3', order: 2 },
  { name: 'Fashion', slug: 'fashion', icon: '👗', color: '#FFEDD5', order: 3 },
  { name: 'Pets', slug: 'pets', icon: '🐾', color: '#FEF9C3', order: 4 },
  { name: 'Comics', slug: 'comics', icon: '📚', color: '#EDE9FE', order: 5 },
  { name: 'Electronics', slug: 'electronics', icon: '💻', color: '#D1FAE5', order: 6 },
];

async function seed() {
  await connectDB();
  for (const c of categories) {
    // upsert = update if it exists, insert if it does not
    await Category.updateOne({ slug: c.slug }, { $set: c }, { upsert: true });
  }
  console.log(`Seeded ${categories.length} categories`);
  await disconnectDB();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
