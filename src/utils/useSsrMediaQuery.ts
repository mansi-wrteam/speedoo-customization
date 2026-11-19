import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";

/**
 * `useMediaQuery` that is safe to use in a server-rendered tree.
 *
 * The server has no viewport, so `react-responsive` answers every query with
 * `false`. A phone then answers `true` on its very first render — and any
 * component that branches on it renders a different tree than the server sent.
 * React calls that a hydration mismatch, throws the server HTML away and
 * re-renders the whole subtree in the browser, which is the entire benefit of
 * server rendering undone on exactly the devices that need it most.
 *
 * On the product page that branch picks between the desktop zoom viewer
 * (react-image-magnify) and the plain mobile image, so the server sent one and
 * every phone built the other.
 *
 * The fix is not to guess the width on the server — it cannot be known — but to
 * make the FIRST client render agree with the server, then tell the truth from
 * the second render on. React re-renders normally after mount, so mobile users
 * still get the mobile tree; they just get it a tick later, without the mismatch
 * and without the server markup being discarded.
 *
 * `false` on that first render is deliberate: it is what the server rendered, so
 * matching it is the whole point. Use this anywhere a media query decides what
 * is rendered inside a server-rendered page.
 */
export const useSsrMediaQuery = (settings: Parameters<typeof useMediaQuery>[0]): boolean => {
  const matches = useMediaQuery(settings);
  const [mounted, setMounted] = useState(false);

  // Runs after the first paint, which is after hydration has already compared
  // the trees — so flipping here is a normal re-render, not a mismatch.
  useEffect(() => setMounted(true), []);

  return mounted && matches;
};
