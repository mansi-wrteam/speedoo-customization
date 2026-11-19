import { useState } from "react";

/**
 * Hands a server-rendered payload to React Query ONLY while the query key still
 * matches the one the server rendered.
 *
 * `initialData` is not scoped to a key — React Query applies it to whatever key
 * the component currently computes. Every seeded query here keys on things the
 * visitor can change mid-session (module, city, language), so switching module
 * created a NEW cache entry and immediately filled it with the OLD module's
 * payload. With `staleTime: 5 minutes` on top, no refetch was scheduled either:
 * the header said Grocery, the URL said `?module=grocery`, and the page showed
 * food for five minutes. A reload fixed it, which is what made it look like
 * HTTP caching.
 *
 * The seed belongs to exactly one key — the one the server used. This captures
 * that key on the first render, which is safe because `applySsrSeed` has already
 * run by then, so the store holds the server's own module, city and language.
 * Once any of them changes the seed is withheld, the query has no data, and it
 * fetches for real.
 *
 * Pass the same values the query key is built from, minus constants:
 *
 *   initialData: useServerSeed(serverShop, [city?.latitude, city?.longitude, language?.id, activeModuleId])
 */
export const useServerSeed = <T>(seed: T | undefined | null, keyParts: unknown[]): T | undefined => {
  const serialized = JSON.stringify(keyParts ?? []);
  // `useState` rather than a ref: the initialiser runs on the first render only,
  // and reading state during render is allowed where reading a ref is not.
  // `null` when this page was not server-rendered — nothing to withhold.
  const [serverKey] = useState<string | null>(seed == null ? null : serialized);

  if (seed == null || serverKey === null) return undefined;
  return serverKey === serialized ? seed : undefined;
};
