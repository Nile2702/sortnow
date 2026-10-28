// In-memory fixed-window rate limiter. A real deployment needs a shared
// store (Redis) since this resets on restart and doesn't work across
// multiple instances - but it's enough to blunt naive password-guessing
// against a single dev/demo instance.
declare global {
  var __sioRateLimitBuckets: Map<string, { count: number; resetAt: number }> | undefined;
}

const buckets = globalThis.__sioRateLimitBuckets ?? (globalThis.__sioRateLimitBuckets = new Map());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count++;
  return { ok: true, retryAfterMs: 0 };
}

// The LAST entry in x-forwarded-for, not the first. Every hop a request
// passes through is supposed to APPEND the address it saw to this header,
// so the first entry is whatever the original client claimed about itself -
// trivially forgeable by just sending a different value on every request,
// which is exactly how an attacker would defeat every rate limit keyed off
// this function (admin-secret brute force, seller/shopper login, OTP
// verify - see the callers of rateLimit()). The LAST entry is the one
// *this app's own* edge network appended from the actual TCP connection it
// saw, which the client never gets to write - Vercel's own docs confirm
// this explicitly ("the last IP in the list represents the address that
// connected to Vercel's network"), and it holds for any standard
// reverse-proxy deployment, not just Vercel.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    return parts[parts.length - 1].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
