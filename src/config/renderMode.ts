// The single build-time switch between the two deployments. See SSR_PLAN.md §3.1.
//
// `NEXT_PUBLIC_*` values are inlined by the compiler, so `SSR_MODE` is a literal
// in the emitted bundle, not a runtime lookup. That is the point: a fork written
// as `dynamic(..., { ssr: SSR_MODE })` compiles down to `ssr: false` in the
// static export — the same code it emits today — and to `ssr: true` in the VPS
// build, with the unused branch eliminated. It is also why `src/server/*` can
// never be reached from the static bundle.
//
// `NEXT_PUBLIC_SEO` keeps its existing meaning and remains the only build-time
// switch; the SSR knobs added later (`SSR_PAGES`, `SSR_CACHE_TTL`, ...) are
// server-only and read at runtime.
export const SSR_MODE = process.env.NEXT_PUBLIC_SEO === "true";
