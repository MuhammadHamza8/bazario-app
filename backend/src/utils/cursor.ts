import { AppError } from './AppError';

/**
 * A cursor marks "where the previous page ended". We encode the last item's
 * sort value and id as an opaque string. The app just sends it back
 * unchanged to get the next page.
 */
export const encodeCursor = (value: string | number, id: string): string =>
  Buffer.from(JSON.stringify({ v: value, id })).toString('base64url');

export function decodeCursor(cursor: string): { v: string | number; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if ((typeof parsed.v === 'string' || typeof parsed.v === 'number') && /^[a-f\d]{24}$/i.test(parsed.id)) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  throw new AppError('Invalid cursor', 400);
}
