import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashGroupPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, KEY_LENGTH) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyGroupPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = await scryptAsync(password, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function generateJoinCode() {
  return randomBytes(5).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
}
