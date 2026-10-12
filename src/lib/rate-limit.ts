import "server-only";

// Fixed-window limiter held in memory. Kaizen runs as one Node process on one VPS (PRD 12.1),
// so this is enough for v1.0. If the app is ever scaled out, move the counters to MySQL or Redis.

type Bucket = { count: number; resetAt: number };
const globalForLimiter = globalThis as unknown as { __kaizenBuckets?: Map<string, Bucket> };
const buckets = (globalForLimiter.__kaizenBuckets ??= new Map<string, Bucket>());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "local";
}
