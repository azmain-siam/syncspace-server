import * as crypto from 'crypto';

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

/**
 * Generates a unique, collision-resistant slug with a 4-character random suffix.
 * Example: "Acme Corp" -> "acme-corp-7a2b"
 */
export function generateUniqueSlug(text: string): string {
  const base = slugify(text) || 'workspace';
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base}-${suffix}`;
}
