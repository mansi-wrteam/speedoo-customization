"use client";
import React, { useEffect, useState } from "react";
import { SSR_MODE } from "@/config/renderMode";

// Swap the artwork's own colours for the module's, leaving everything else be.
// Only hex and currentColor inside fill/stroke are touched, so `url(#mask0_…)`
// references, `fill="none"`, and the `fill="white"` inside a Figma export's
// <mask> all survive — recolouring any of those would break the shape.
//
// Uploaded icons carry hex fills; the fallback icon the API serves when a module
// has no image is stroke-based and uses currentColor, which resolves to black
// inside an <img> because there is no parent to inherit from.
const tintSvg = (markup: string, color: string) =>
  markup
    .replace(/(fill|stroke)="#[0-9a-fA-F]{3,8}"/g, `$1="${color}"`)
    .replace(/(fill|stroke):\s*#[0-9a-fA-F]{3,8}/g, `$1:${color}`)
    .replace(/(fill|stroke)="currentColor"/g, `$1="${color}"`)
    .replace(/(fill|stroke):\s*currentColor/g, `$1:${color}`);

// One request per icon per visit. The header renders every icon twice (desktop
// and mobile rows), remounts on each route change, and re-tints whenever the
// active module changes; all of those share this promise. A failure is cached
// as null too, so a broken icon is not retried on every page.
const markupCache = new Map<string, Promise<string | null>>();

const loadMarkup = (src: string) => {
  let pending = markupCache.get(src);
  if (!pending) {
    // Same-origin read: the asset host itself refuses cross-origin fetches.
    pending = fetch(`/api/module-icon?url=${encodeURIComponent(src)}`)
      .then((res) => (res.ok ? res.text() : null))
      .then((markup) => (markup?.includes("<svg") ? markup : null))
      .catch(() => null);
    markupCache.set(src, pending);
  }
  return pending;
};

export interface ModuleIconProps {
  src?: string;
  /** Module primary colour; empty or "currentColor" keeps the original artwork. */
  color?: string;
  className?: string;
}

/**
 * Module pill icon, shown in that module's own primary colour.
 *
 * These SVGs are admin uploads with their colour baked in, served from a host
 * that sends no CORS headers — so they're read through /api/module-icon, which
 * re-serves them same-origin. The markup is then recoloured and handed back as
 * a data URI.
 *
 * A CSS mask would be the lighter option, but these are Figma exports whose
 * artwork hangs off an internal <mask>, which doesn't survive being used as one
 * (the icon collapses to a filled box). Rendering the SVG normally keeps the
 * shape exactly as it is today.
 *
 * Pass no colour (or "currentColor") to get the untouched artwork — the active
 * pill does this and relies on the button's invert filter to go white.
 *
 * The static export (`next dev` included) has no API routes, so there is no
 * proxy and the markup can't be read. It paints the icon's silhouette instead:
 * the <img> is pushed out of its clipped box and a drop-shadow of it is cast
 * back into place in `currentColor`, which ModuleButton sets to the module
 * colour (white on the active/hover pill). Drawing a shadow never reads the
 * pixels, so CORS doesn't apply. Every uploaded icon is a single colour, so the
 * silhouette is the same shape.
 */
const ModuleIcon = ({ src, color, className = "" }: ModuleIconProps) => {
  const [tintedUrl, setTintedUrl] = useState<string | null>(null);

  const shouldTint = Boolean(color) && color !== "currentColor";

  useEffect(() => {
    if (!SSR_MODE || !src || !shouldTint) {
      setTintedUrl(null);
      return;
    }
    let alive = true;
    loadMarkup(src).then((markup) => {
      if (!alive) return;
      // No markup: keep the original artwork rather than showing nothing.
      setTintedUrl(
        markup
          ? `data:image/svg+xml;utf8,${encodeURIComponent(tintSvg(markup, color!))}`
          : null,
      );
    });
    return () => {
      alive = false;
    };
  }, [src, color, shouldTint]);

  if (!src) return null;

  if (!SSR_MODE && shouldTint) {
    return (
      <span className={`${className} inline-block overflow-hidden`}>
        <span
          className="block size-full"
          style={{ filter: "drop-shadow(100vw 0 0 currentColor)", willChange: "filter" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="block size-full object-contain"
            style={{ transform: "translateX(-100vw)" }}
          />
        </span>
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={tintedUrl || src}
      alt=""
      className={`${className} object-contain`}
    />
  );
};

export default ModuleIcon;
