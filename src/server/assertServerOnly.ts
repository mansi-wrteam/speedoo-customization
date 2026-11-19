// EGROCER_SERVER_ONLY
//
// Every module under src/server/ calls this at module scope. Two jobs:
//
//  1. It fails loudly if server code is ever evaluated in a browser, instead of
//     quietly working and shipping the API plumbing to visitors.
//  2. The sentinel below is a *used* string, so it survives bundling. That is
//     what lets scripts/verify-server-only.mjs detect a leak by grepping the
//     built client chunks — a sentinel that only existed in a comment would be
//     stripped by minification and the check would pass for the wrong reason.
//
// See SSR_PLAN.md §3.3.

/** Grepped for by scripts/verify-server-only.mjs. Do not rename. */
export const SERVER_ONLY_SENTINEL = "EGROCER_SERVER_ONLY";

export const assertServerOnly = (moduleName: string) => {
  if (typeof window !== "undefined") {
    throw new Error(
      `${SERVER_ONLY_SENTINEL}: ${moduleName} was loaded in a browser. ` +
        `Modules under src/server/ may only be imported from getServerSideProps.`,
    );
  }
};
