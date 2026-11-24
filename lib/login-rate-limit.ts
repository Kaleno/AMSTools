export const LOGIN_ATTEMPT_LIMIT = 5;
export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type Bucket = { count: number; resetAt: number };

export function createLoginRateLimiter(options?: {
  limit?: number;
  windowMs?: number;
  now?: () => number;
}) {
  const limit = options?.limit ?? LOGIN_ATTEMPT_LIMIT;
  const windowMs = options?.windowMs ?? LOGIN_ATTEMPT_WINDOW_MS;
  const now = options?.now ?? Date.now;
  const hits = new Map<string, Bucket>();

  function id(ip: string, email: string) {
    return `${ip}\n${email.trim().toLowerCase()}`;
  }

  function live(bucket: Bucket | undefined) {
    if (!bucket || now() >= bucket.resetAt) return undefined;
    return bucket;
  }

  return {
    check(ip: string, email: string) {
      const bucket = live(hits.get(id(ip, email)));
      if (!bucket || bucket.count < limit) {
        return { limited: false, retryAfterSeconds: 0 };
      }
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now()) / 1000));
      return { limited: true, retryAfterSeconds };
    },
    recordFailure(ip: string, email: string) {
      const key = id(ip, email);
      const time = now();
      const bucket = live(hits.get(key));
      if (!bucket) {
        hits.set(key, { count: 1, resetAt: time + windowMs });
      } else {
        bucket.count += 1;
      }
      if (hits.size > 10000) {
        for (const [stored, value] of hits) {
          if (time >= value.resetAt) hits.delete(stored);
        }
      }
    },
    clear(ip: string, email: string) {
      hits.delete(id(ip, email));
    },
  };
}

/** Process-local counters. A restart clears them. One Node process does not see another's counts. */
export const loginRateLimiter = createLoginRateLimiter();

export function clientAddress(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 200);
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 200);
  return "unknown";
}
