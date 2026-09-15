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
/**
 * Generates a clean 2-4 letter uppercase project key from title.
 * Examples: "General" -> "GEN", "Frontend Core" -> "FC", "Backend" -> "BAC"
 */
export function generateProjectKey(title: string): string {
  const words = title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'TASK';
  if (words.length === 1) {
    const word = words[0];
    return word.length <= 4 ? word : word.slice(0, 3);
  }

  // Multi-word: take first letter of each word (up to 4 chars)
  const key = words
    .map((w) => w[0])
    .join('')
    .slice(0, 4);
  return key.length >= 2
    ? key
    : `${words[0].slice(0, 2)}${words[1]?.[0] || ''}`;
}
