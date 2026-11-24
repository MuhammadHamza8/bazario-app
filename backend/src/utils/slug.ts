/** "Islamabad City" -> "islamabad-city". Used for consistent filtering by city. */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // anything that is not a letter/number becomes "-"
    .replace(/^-+|-+$/g, ''); // remove leading/trailing "-"
