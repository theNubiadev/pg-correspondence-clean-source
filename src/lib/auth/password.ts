import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plain, passwordHash);
}

/**
 * Constant-time comparison used when checking a password against a dummy hash
 * for accounts that do not exist, so that response timing does not reveal
 * whether an email address is registered.
 */
export const DUMMY_PASSWORD_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.6qkJ8ThRZFPZbA1FVWx1uXhqk4o8ZTe";

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Session and reset tokens are stored as SHA-256 digests. A leaked database
 * dump therefore cannot be replayed as a valid session.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export { assessPassword, type PasswordStrength } from "@/lib/auth/password-policy";
