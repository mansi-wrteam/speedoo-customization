// Environment variables read by the app (see .env). All are optional at the
// type level: a missing value is `undefined`, which is how the code treats it.
// NODE_ENV is typed by Next.js itself.

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_API_URL?: string;
    readonly NEXT_PUBLIC_API_SUBURL?: string;
    readonly NEXT_PUBLIC_BASE_URL?: string;
    readonly NEXT_PUBLIC_WEB_NAME?: string;
    /** "true" → standalone server with SEO getServerSideProps; anything else → static export. */
    readonly NEXT_PUBLIC_SEO?: string;
    readonly NEXT_PUBLIC_VERSION?: string;

    readonly NEXT_PUBLIC_META_TITLE?: string;
    readonly NEXT_PUBLIC_META_DESCRIPTION?: string;
    readonly NEXT_PUBLIC_META_KEYWORDS?: string;

    readonly NEXT_PUBLIC_MAP_API?: string;

    readonly NEXT_PUBLIC_FIREBASE_API_KEY?: string;
    readonly NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    readonly NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
    readonly NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    readonly NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly NEXT_PUBLIC_FIREBASE_APP_ID?: string;
    readonly NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
    readonly NEXT_PUBLIC_FIREBASE_VAPID_KEY?: string;

    readonly NEXT_PUBLIC_DEMO_MODE?: string;
    readonly NEXT_PUBLIC_DEMO_LOGIN_NO?: string;
    readonly NEXT_PUBLIC_DEMO_OTP?: string;
    readonly NEXT_PUBLIC_DEFAULT_COUNTRY_CODE?: string;
    readonly NEXT_PUBLIC_COUNTRY_DIAL_CODE?: string;
    readonly NEXT_PUBLIC_COUNTRY_DROPDOWN?: string;

    /** Custom server port (server.js). */
    readonly NODE_PORT?: string;

    // ── Server-only SSR knobs (SSR_PLAN.md §8.1) ─────────────────────────────
    // Deliberately NOT prefixed NEXT_PUBLIC_: they must never be inlined into
    // the browser bundle, and they are read per request so a PM2 restart is
    // enough to change them. None is required; each has a default.

    /**
     * Comma-separated routes allowed to server-render their body, e.g.
     * "/,/products,/about-us". Unset = all of them. The production kill switch:
     * drop a misbehaving route and restart, no rebuild.
     */
    readonly SSR_PAGES?: string;
    /** Seconds the deployment-global payloads stay in the process cache. Default 300. */
    readonly SSR_CACHE_TTL?: string;
    /** Per-request upstream timeout in ms before degrading to a client fetch. Default 4000. */
    readonly SSR_API_TIMEOUT_MS?: string;
    /** `s-maxage` for public server-rendered pages. 0 disables the header. Default 60. */
    readonly SSR_CACHE_CONTROL_MAX_AGE?: string;
    /** "true" returns a real 404 for unknown product/blog/category slugs. Default off. */
    readonly SSR_404_ON_MISSING?: string;
  }
}
