// EGROCER_SERVER_ONLY
//
// A small in-process TTL cache for payloads that are the same for every
// visitor. See SSR_PLAN.md §3.3 and §8.
//
// The client fetches settings, theme, the language list, the module list and the
// payment settings once per page view, from Layout's mount effects. Server
// rendering would otherwise repeat all of that on every single request, turning
// one page view into five extra upstream calls. None of those payloads depend on
// who is asking, so one copy per process for `SSR_CACHE_TTL` seconds is enough.
//
// What must NOT go in here: anything derived from the request — the resolved
// city when it came from a cookie, anything behind a token, anything
// user-specific. Those are per-request by definition, and caching them is the
// cross-request leak SSR_PLAN.md §3.2 is about. The cache key is the only guard,
// so callers key on every input the value depends on.
//
// A rejected promise is never cached: a failed fetch must be retried on the next
// request rather than remembered for the whole TTL.
import { assertServerOnly } from "./assertServerOnly";

assertServerOnly("server/cache");

const DEFAULT_TTL_SECONDS = 300;

const ttlMs = () => {
  const raw = Number(process.env.SSR_CACHE_TTL);
  return (Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_SECONDS) * 1000;
};

interface Entry<T> {
  value: Promise<T>;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/**
 * Returns the cached value for `key`, or runs `load()` and caches it.
 *
 * The in-flight promise is stored, not the resolved value, so a burst of
 * concurrent requests on a cold cache makes one upstream call rather than one
 * each.
 */
export const cached = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as Promise<T>;

  const value = load().catch((error) => {
    // Don't let a failure occupy the slot for the rest of the TTL.
    store.delete(key);
    throw error;
  });

  store.set(key, { value, expiresAt: now + ttlMs() });
  return value;
};

/** Test and operational helper. */
export const clearServerCache = () => store.clear();

/** Current size, for the memory watch in SSR_PLAN.md phase 7. */
export const serverCacheSize = () => store.size;
