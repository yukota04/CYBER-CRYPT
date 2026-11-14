import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Strips HTML tags, script injections, and control characters from user text inputs.
 */
export function sanitizeText(input: unknown, maxLen = 200): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, (ch) => {
      switch (ch) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        case '`': return '&#96;';
        default: return ch;
      }
    })
    .trim()
    .slice(0, maxLen);
}

/**
 * Validates operative username format and length (3-24 alphanumeric/underscore/hyphen chars).
 */
export function validateUsername(username: unknown): { valid: boolean; error?: string; clean: string } {
  if (typeof username !== 'string') {
    return { valid: false, error: 'Username must be a string', clean: '' };
  }
  const clean = username.trim();
  if (clean.length < 3 || clean.length > 24) {
    return { valid: false, error: 'Username must be 3-24 characters', clean };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, error: 'Username may only contain letters, numbers, underscores, and hyphens', clean };
  }
  return { valid: true, clean };
}

/**
 * Validates password strength (minimum 8 characters).
 */
export function validatePassword(password: unknown): { valid: boolean; error?: string } {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return { valid: false, error: 'Password must be between 8 and 128 characters' };
  }
  return { valid: true };
}

/**
 * Validates basic email address format.
 */
export function validateEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Generates a cryptographically strong session token.
 */
export function generateSessionToken(prefix = 'tok'): string {
  return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Salted scrypt password hashing (format: salt:derivedKeyHex).
 */
export function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Timing-safe password verification against a stored salted scrypt hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function deriveAesKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive payloads (like cloud saves) using AES-256-GCM.
 */
export function encryptPayload(plaintext: string, secretKey: string): string {
  const key = deriveAesKey(secretKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts AES-256-GCM payloads.
 */
export function decryptPayload(cipherPayload: string, secretKey: string): string {
  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted payload');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const key = deriveAesKey(secretKey);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Sliding-window in-memory rate limiter middleware for Express.
 */
export function createRateLimiter(windowMs: number, maxRequests: number, label = 'API') {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${label}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const now = Date.now();
    const timestamps = (hits.get(key) || []).filter(ts => now - ts < windowMs);

    if (timestamps.length >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
      return res.status(429).json({
        error: `Too many requests on ${label}. Please retry shortly.`
      });
    }

    timestamps.push(now);
    hits.set(key, timestamps);

    // Periodic pruning when map grows large
    if (hits.size > 5000) {
      for (const [k, list] of hits.entries()) {
        if (list.every(ts => now - ts >= windowMs)) hits.delete(k);
      }
    }

    next();
  };
}
