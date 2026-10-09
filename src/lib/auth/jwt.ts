import { jwtVerify, SignJWT } from "jose";

/**
 * Edge-compatible session token helpers.
 *
 * Kept free of Prisma and `node:crypto` imports so that `middleware.ts` can
 * verify a token in the Edge runtime without pulling the database client into
 * the bundle.
 */

export const SESSION_COOKIE = "pgcms_session";
export const SESSION_ISSUER = "pgcms";
export const SESSION_AUDIENCE = "pgcms:web";

export type SessionClaims = {
  /** Session row id. */
  sid: string;
  /** User id. */
  sub: string;
};

let cachedKey: Uint8Array | null = null;

function secretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Generate one with `openssl rand -base64 48`.",
    );
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export function sessionMaxAgeSeconds(): number {
  const parsed = Number.parseInt(process.env.SESSION_MAX_AGE ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 8;
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sid: claims.sid })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + sessionMaxAgeSeconds())
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      return null;
    }
    return { sub: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
}
