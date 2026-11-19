"use client";
import { useEffect, useState } from "react";
import type { StaticImageData } from "next/image";

/**
 * Recolours a static SVG asset from design tokens at runtime.
 *
 * SVG files imported through webpack arrive as URLs, so their baked-in `fill`
 * attributes are unreachable from CSS — a `<img>`/`next/image` or a Google Maps
 * marker renders whatever colour the file was authored with. That breaks
 * theming: the palette now comes from /api/theme, but these assets can't follow.
 *
 * This hook fetches the file, swaps the literal colours for the current value
 * of the given tokens, and hands back a data URI. It re-runs whenever the theme
 * flips, so light/dark and API-driven palettes both stay in sync.
 *
 * Prefer `MaskedIcon` for single-colour icons — it needs no network round-trip.
 * Use this when the artwork has several colours, or when the consumer demands a
 * URL (map markers, `next/image`).
 *
 * @param {object|string} src        Imported SVG (static import) or a URL.
 * @param {Record<string,string>} replacements  literal colour -> CSS custom property,
 *                                              e.g. { "#55AE7B": "--brand-foreground-default" }
 * @param {unknown} [revalidateOn]   extra dependency to re-tint on (usually the theme).
 * @returns {string} data URI, or the original URL until tinting resolves.
 */
export const useTintedSvg = (
  src: string | StaticImageData | { src?: string } | null | undefined,
  replacements?: Record<string, string> | null,
  revalidateOn?: unknown,
): string | undefined => {
  const url = typeof src === "string" ? src : src?.src;
  const [tinted, setTinted] = useState(url);

  // Serialise the map so the effect doesn't re-run on every render when an
  // object literal is passed inline.
  const key = JSON.stringify(replacements ?? {});

  useEffect(() => {
    if (!url || typeof window === "undefined") return;

    let alive = true;
    const map: Record<string, string> = JSON.parse(key);

    const resolve = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((markup) => {
        let out = markup;
        Object.entries(map).forEach(([literal, token]) => {
          const value = resolve(token);
          // No value means the token is missing — leave the original colour
          // rather than writing an empty fill and losing the shape.
          if (!value) return;
          out = out.replace(new RegExp(literal, "gi"), value);
        });
        if (alive) setTinted(`data:image/svg+xml;utf8,${encodeURIComponent(out)}`);
      })
      .catch(() => {
        // Network or parse failure: keep the untinted asset so the UI still
        // renders something.
        if (alive) setTinted(url);
      });

    return () => {
      alive = false;
    };
  }, [url, key, revalidateOn]);

  return tinted;
};

export default useTintedSvg;
