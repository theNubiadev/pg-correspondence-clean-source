/** Absolute expiry remains controlled by SESSION_MAX_AGE in jwt.ts. */
export const SESSION_IDLE_TIMEOUT_SECONDS = 15 * 60;
export const SESSION_IDLE_WARNING_SECONDS = 60;
export const SESSION_TOUCH_INTERVAL_SECONDS = 60;

export function sessionIdleCutoff(now = new Date()): Date {
  return new Date(now.getTime() - SESSION_IDLE_TIMEOUT_SECONDS * 1000);
}
