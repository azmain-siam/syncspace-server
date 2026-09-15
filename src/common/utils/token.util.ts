import * as crypto from 'crypto';

export interface GeneratedTokenPair {
  rawToken: string;
  hashedToken: string;
}

// Generate random secure token and its SHA-256 hash
export function generateSecureToken(): GeneratedTokenPair {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  return { rawToken, hashedToken };
}

// Hash raw token using SHA-256
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
