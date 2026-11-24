/**
 * An error we throw ON PURPOSE for expected problems
 * (wrong password, item not found, ...).
 * It carries the HTTP status code so the error handler knows what to send.
 *
 * Usage: throw new AppError('Listing not found', 404);
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}
