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

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
