import { SSR_MODE } from "@/config/renderMode";

/**
 * Routes an image URL through Next's optimizer by hand.
 *
 * Needed because `react-image-magnify` (the product-detail zoom) takes plain URL
 * strings and renders raw `<img>` tags, so it bypasses `next/image` completely.
 * That left the hero image on the product page — the one a buyer actually
 * studies, and the likely LCP element there — served at full size with no AVIF
 * and no resizing, while every listing grid was already optimized.
 *
 * Rules, each of which matters:
 *
 *  - Static export has no optimizer, so it returns the URL untouched. The export
 *    build sets `images.unoptimized`, and `/_next/image` simply does not exist
 *    there.
 *  - `width` must be one of Next's configured `deviceSizes`/`imageSizes`;
 *    anything else is rejected with a 400. 640 and 1200 are both defaults.
 *  - `quality` must be declared in `images.qualities`. Only 75 (the default) is,
 *    so that is what this sends.
 *  - Only absolute http(s) URLs are transformed. A relative path or an imported
 *    static asset is already served from `/_next/static` and must be left alone,
 *    and a host outside `remotePatterns` would 400.
 */
export const optimizedImageUrl = (
  src: string | undefined,
  width: 640 | 1200,
): string | undefined => {
  if (!src) return src;
  if (!SSR_MODE) return src;
  if (!/^https?:\/\//i.test(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
};
