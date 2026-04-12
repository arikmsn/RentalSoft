interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function checkRateLimit(req: any): { allowed: boolean; retryAfter?: number } {
  const ip = getClientIp(req);
  const now = Date.now();

  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, firstAttempt: now, lockedUntil: null });
    return { allowed: true };
  }

  if (entry.lockedUntil !== null) {
    if (now < entry.lockedUntil) {
      return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    store.delete(ip);
    return { allowed: true };
  }

  if (now - entry.firstAttempt > WINDOW_MS) {
    store.set(ip, { count: 1, firstAttempt: now, lockedUntil: null });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    store.set(ip, entry);
    return { allowed: false, retryAfter: Math.ceil(LOCKOUT_MS / 1000) };
  }

  entry.count += 1;
  store.set(ip, entry);
  return { allowed: true };
}

export function clearRateLimit(req: any): void {
  const ip = getClientIp(req);
  store.delete(ip);
}

export function logRateLimitState(req: any, action: string): void {
  const ip = getClientIp(req);
  const entry = store.get(ip);
  console.log(`[RateLimit] ${action} | IP: ${ip} | attempts: ${entry?.count ?? 0} | lockedUntil: ${entry?.lockedUntil ?? 'none'}`);
}
