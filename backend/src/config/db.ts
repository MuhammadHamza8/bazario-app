import mongoose from 'mongoose';
import { env } from './env';

/**
 * Opens one shared connection to MongoDB.
 * Mongoose keeps this connection and reuses it for every query in the app.
 */
export async function connectDB(): Promise<void> {
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  await mongoose.connect(env.MONGO_URI);
  console.log('MongoDB connected');
}

/** Closes the connection (used during graceful shutdown). */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
