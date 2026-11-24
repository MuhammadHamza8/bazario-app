import { Schema, model } from 'mongoose';

/**
 * Categories are stored as DATA (not hardcoded in the app), so you can add
 * or reorder one without releasing a new app version.
 */
const categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // "vehicles"
  icon: { type: String, required: true }, // emoji shown in the app
  color: { type: String, required: true }, // tile background colour
  order: { type: Number, default: 0 }, // display order
  isActive: { type: Boolean, default: true },
});

export const Category = model('Category', categorySchema);
