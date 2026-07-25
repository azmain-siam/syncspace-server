/* eslint-disable no-useless-escape */
/**
 * Converts text into a clean URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}
