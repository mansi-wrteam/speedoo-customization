import * as api from "@/api/apiRoutes";
import type { GetProductByIdParams } from "@/api/apiRoutes";
import type { Product } from "@/types/models/product";

// Short-lived, in-memory cache of `product_by_id` — the only payload carrying
// variants + `addon_groups`. Cards prefetch into it on hover so the food
// Customise sheet and the quick view open without waiting on the network.
// In-flight requests are shared too, so a hover and the click that follows
// never fire the same call twice. Kept short so stock and prices stay fresh.
const TTL_MS = 2 * 60 * 1000;

interface Entry {
  at: number;
  promise: Promise<Product | null>;
  data: Product | null;
}

const cache = new Map<string, Entry>();

// `id: -1` means "look up by slug only" — same key as no id.
const keyOf = ({ id, slug, latitude, longitude }: GetProductByIdParams) =>
  [id === -1 ? "" : id ?? "", slug ?? "", latitude ?? "", longitude ?? ""].join("|");

const freshEntry = (params: GetProductByIdParams) => {
  const entry = cache.get(keyOf(params));
  return entry && Date.now() - entry.at < TTL_MS ? entry : null;
};

/** Resolves to the full product, or null when the API has none. Failures are not cached. */
export const fetchProductDetail = (params: GetProductByIdParams): Promise<Product | null> => {
  const hit = freshEntry(params);
  if (hit) return hit.promise;

  const key = keyOf(params);
  const entry: Entry = { at: Date.now(), data: null, promise: Promise.resolve(null) };
  entry.promise = api
    .getProductById(params)
    .then((response) => {
      const fetched = Array.isArray(response?.data) ? response?.data?.[0] : response?.data;
      if (response?.status != 1 || !fetched) {
        cache.delete(key);
        return null;
      }
      entry.data = fetched;
      return fetched;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, entry);
  return entry.promise;
};

/** Fire-and-forget warm-up; errors surface on the real fetch instead. */
export const prefetchProductDetail = (params: GetProductByIdParams) => {
  if ((params.id == null || params.id === -1) && !params.slug) return;
  if (params.latitude == null || params.longitude == null) return;
  fetchProductDetail(params).catch(() => {});
};

/** The cached product when it is already loaded, so callers can skip a loader. */
export const peekProductDetail = (params: GetProductByIdParams): Product | null =>
  freshEntry(params)?.data ?? null;
