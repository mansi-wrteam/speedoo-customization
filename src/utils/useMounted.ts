import { useEffect, useState } from "react";

/**
 * False during the server render and during the client's FIRST render, true
 * afterwards. See SSR_PLAN.md §5.
 *
 * Server-rendered markup has to match the client's first render exactly, or
 * React 19 throws the server HTML away for that subtree — which silently undoes
 * the whole point of rendering it on the server. Two things in this app cannot
 * match on the first pass:
 *
 *   - anything from `redux-persist`: the cart badge, wishlist hearts, the saved
 *     address, the signed-in name. The server renders as a guest, and the client
 *     rehydrates from localStorage only AFTER mount.
 *   - `useMediaQuery`, which has no viewport to measure on the server and so
 *     reports false, picking the wrong branch of a mobile/desktop split.
 *
 * Gating on this hook makes the first client render agree with the server, and
 * lets the real value appear on the second. Use it for presentation only —
 * never to decide whether to fetch.
 */
export const useMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
};
