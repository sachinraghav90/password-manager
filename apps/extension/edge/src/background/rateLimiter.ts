/**
 * Simple in-memory token-bucket rate limiter for the background service worker.
 * Resets when the service worker unloads (intentional — prevents cross-session brute force).
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitRule {
  /** Max calls allowed per window */
  maxTokens: number;
  /** Refill window in milliseconds */
  windowMs: number;
}

const RULES: Record<string, RateLimitRule> = {
  UNLOCK:               { maxTokens: 5,  windowMs: 60_000 },  // 5 attempts per minute
  GET_MATCHING_LOGINS:  { maxTokens: 30, windowMs: 10_000 },  // 30 queries per 10 s
};

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the call should be allowed, false if rate-limited.
 * Key is usually `messageType:senderId`.
 */
export function checkRateLimit(messageType: string, senderId: string): boolean {
  const rule = RULES[messageType];
  if (!rule) return true; // no rule → always allow

  const key = `${messageType}:${senderId}`;
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: rule.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens proportional to elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= rule.windowMs) {
    bucket.tokens = rule.maxTokens;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) return false;

  bucket.tokens -= 1;
  return true;
}

/** Reset a specific key (e.g., after successful unlock) */
export function resetRateLimit(messageType: string, senderId: string): void {
  buckets.delete(`${messageType}:${senderId}`);
}
