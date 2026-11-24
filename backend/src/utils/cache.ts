import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Redis is an in-memory key-value store: reading from it takes ~1 ms,
 * while a MongoDB query can take much longer. We use it as a CACHE:
 * remember the answer to expensive, frequently-repeated questions.
 *
 * Redis is OPTIONAL here. If REDIS_URL is empty, or Redis is down, every
 * function below quietly does nothing and the app simply reads from MongoDB.
 * A cache must never be able to break the app.
 */
const client = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1, // do not hang a request waiting for Redis
      enableOfflineQueue: false, // fail fast while disconnected
      retryStrategy: (times) => Math.min(times * 500, 5000), // keep reconnecting in the background
    })
  : null;

let errorLogged = false;
client?.on('error', (err) => {
  if (!errorLogged) console.warn('Redis unavailable, continuing without cache:', err.message);
  errorLogged = true; // log once, not on every retry
});
client?.on('ready', () => {
  errorLogged = false;
  console.log('Redis connected');
});

const isReady = () => client?.status === 'ready';

/** 'disabled' (no REDIS_URL), 'connected', or 'unavailable'. */
export const cacheStatus = () => (!client ? 'disabled' : isReady() ? 'connected' : 'unavailable');

/**
 * "Cache-aside" pattern, the most common caching strategy:
 *   1. look in the cache  -> found? return it (a "hit")
 *   2. not found ("miss") -> run the real work (e.g. the MongoDB query)
 *   3. store the result with an expiry (TTL), then return it
 */
export async function cached<T>(key: string, ttlSeconds: number, work: () => Promise<T>): Promise<T> {
  if (isReady()) {
    try {
      const hit = await client!.get(key);
      if (hit) return JSON.parse(hit) as T;
    } catch {
      /* cache problem: fall through to the database */
    }
  }

  const result = await work();

  if (isReady()) {
    // "EX" = expire after N seconds, so stale data cannot live forever
    client!.set(key, JSON.stringify(result), 'EX', ttlSeconds).catch(() => {});
  }
  return result;
}

/**
 * Cache INVALIDATION is the hard part of caching: when data changes, cached
 * copies become wrong. A simple trick is a VERSION number inside every key
 * ("feed:7:..."). To invalidate everything, just bump the version: old keys
 * are never read again and expire on their own.
 */
export async function getVersion(name: string): Promise<number> {
  if (!isReady()) return 0;
  try {
    return Number((await client!.get(`version:${name}`)) ?? 0);
  } catch {
    return 0;
  }
}

export async function bumpVersion(name: string): Promise<void> {
  if (!isReady()) return;
  try {
    await client!.incr(`version:${name}`);
  } catch {
    /* ignore */
  }
}

export async function disconnectCache(): Promise<void> {
  await client?.quit().catch(() => {});
}
