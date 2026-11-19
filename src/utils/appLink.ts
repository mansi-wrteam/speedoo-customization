import type { AppSettings } from "@/types/models/settings";

/**
 * Links for "Open in app" (DEEPLINK_SPEC.md). Pure functions, so the banner
 * only decides WHEN to show and WHICH link to follow; the shape of every link
 * is pinned by appLink.test.ts.
 */

/** DEEPLINK_SPEC.md §1: lower-case, starts with a letter, no `://`. */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*$/;

const OFF = new Set(["0", "false"]);

/**
 * The scheme the apps register, or null when the feature is off: switched off,
 * no scheme, or one that would fail silently (the commonest breakage, §7.1).
 */
export const appScheme = (settings: AppSettings | null | undefined): string | null => {
  const deeplink = settings?.deeplink_settings;
  if (!deeplink) return null;
  if (deeplink.deeplink_enabled != null && OFF.has(String(deeplink.deeplink_enabled).trim().toLowerCase())) {
    return null;
  }
  const scheme = String(deeplink.deeplink_scheme ?? "").trim();
  return SCHEME_PATTERN.test(scheme) ? scheme : null;
};

/** `…details?id=com.example.app` → `com.example.app`. */
export const androidPackage = (playstoreUrl: string | null | undefined): string | null => {
  if (!playstoreUrl) return null;
  try {
    const id = new URL(playstoreUrl).searchParams.get("id");
    return id && /^[A-Za-z][\w]*(\.[A-Za-z][\w]*)+$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

/** `…/app/name/id1234567890` → `1234567890`. */
export const iosAppId = (appstoreUrl: string | null | undefined): string | null => {
  const match = appstoreUrl?.match(/\/id(\d{5,})(?:[/?#]|$)/);
  return match ? match[1] : null;
};

/** Where the visitor is: path plus query, so `module` and `lang` ride along (§2.3). */
export interface PageLocation {
  host: string;
  /** Starts with `/`, includes the query string, no hash. */
  pathWithQuery: string;
}

/** `scheme://host/path?query` — what iOS opens and what both apps parse. */
export const schemeLink = (scheme: string, page: PageLocation) =>
  `${scheme}://${page.host}${page.pathWithQuery}`;

/**
 * Play Store link that carries the destination through an install (§5): the
 * app reads `deep_link` from the install referrer on first launch.
 */
export const playStoreLink = (playstoreUrl: string | null | undefined, page: PageLocation): string | null => {
  const pkg = androidPackage(playstoreUrl);
  if (!pkg) return playstoreUrl || null;
  const referrer = `utm_source=web&deep_link=${encodeURIComponent(page.pathWithQuery)}`;
  return `https://play.google.com/store/apps/details?id=${pkg}&referrer=${encodeURIComponent(referrer)}`;
};

/**
 * Android link. With a package name it is an `intent://` URL: Chrome opens the
 * app, or goes straight to the store when it isn't installed — no error page
 * and no timer guessing (§2.2). Without one, the plain scheme link.
 */
export const androidLink = (scheme: string, page: PageLocation, playstoreUrl: string | null | undefined) => {
  const pkg = androidPackage(playstoreUrl);
  if (!pkg) return schemeLink(scheme, page);
  const fallback = playStoreLink(playstoreUrl, page);
  return (
    `intent://${page.host}${page.pathWithQuery}#Intent;scheme=${scheme};package=${pkg};` +
    (fallback ? `S.browser_fallback_url=${encodeURIComponent(fallback)};` : "") +
    "end"
  );
};
