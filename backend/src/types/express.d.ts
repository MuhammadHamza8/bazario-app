/** Tells TypeScript that `req.userId` exists (set by the `authenticate` middleware). */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
export {};
