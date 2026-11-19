// Proves that nothing under src/server/ reaches the browser.
//
// SSR_PLAN.md §3.3 puts every server-side module in src/server/ and relies on
// Next stripping it from the client bundle, because it is only ever imported
// from getServerSideProps. That is a promise about the bundler, so it has to be
// checked against the built output rather than trusted. If it ever breaks, the
// API base URL, the timeout values, the cache internals and the shape of the
// upstream calls all ship to visitors.
//
// Three checks, in order of strength:
//
//   1. Source rule — an import of @/server/ is only allowed inside src/pages/.
//      Cheap, and catches the mistake at the moment it is made.
//   2. Sentinel rule — every file under src/server/ must contain the sentinel
//      string, so check 3 can actually see it. Without this, a server file that
//      forgot the sentinel would make check 3 pass for the wrong reason.
//   3. Bundle rule — the sentinel must not appear in any client asset, and no
//      client asset may mention a src/server/ path.
//
// Usage:
//   node scripts/verify-server-only.mjs            # checks whichever builds exist
//
// Exit 0 = clean. Exit 1 = a leak or a missing sentinel. Exit 2 = bad usage.
//
// Before SSR_PLAN.md phase 2 there is no src/server/, and the script reports
// that and passes. That is expected, not a silent skip: the message says so.
import fs from "node:fs";
import path from "node:path";

export const SENTINEL = "EGROCER_SERVER_ONLY";

const SERVER_DIR = "src/server";

// Where client-side assets end up. Each is optional: a repo may have built only
// one of the two deployment modes.
const CLIENT_ASSET_DIRS = [
  "out/_next/static", // static export
  ".next/static", // standalone build, client chunks
  ".next/standalone/.next/static", // the copy scripts/copy-assets.js makes
];

const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
};

const failures = [];
const notes = [];

// ── 1. Source rule: only pages may import @/server/.
const sourceFiles = walk("src").filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f));
const importsServer = /from\s+["']@\/server\/|require\(\s*["']@\/server\//;

for (const file of sourceFiles) {
  const rel = file.split(path.sep).join("/");
  if (rel.startsWith(`${SERVER_DIR}/`)) continue; // server code may import itself
  if (!importsServer.test(fs.readFileSync(file, "utf8"))) continue;
  if (rel.startsWith("src/pages/")) continue; // allowed: getServerSideProps lives here
  failures.push(
    `${rel} imports @/server/. Only files under src/pages/ may, and only from getServerSideProps.`,
  );
}

// ── 2. Sentinel rule: every server module must be detectable in check 3.
const serverFiles = walk(SERVER_DIR).filter((f) => /\.(ts|tsx|js|mjs)$/.test(f));

if (!serverFiles.length) {
  notes.push(
    `No ${SERVER_DIR}/ yet — nothing can leak. Expected until SSR_PLAN.md phase 2 creates it.`,
  );
} else {
  for (const file of serverFiles) {
    if (fs.readFileSync(file, "utf8").includes(SENTINEL)) continue;
    failures.push(
      `${file.split(path.sep).join("/")} has no ${SENTINEL} marker, so a leak of this file could not be detected. Add it.`,
    );
  }
}

// ── 3. Bundle rule: the real proof.
const assetDirs = CLIENT_ASSET_DIRS.filter((d) => fs.existsSync(d));

if (!assetDirs.length) {
  console.error(
    `No client assets found. Build first (NEXT_PUBLIC_SEO=false or =true npx next build).\n` +
      `Looked in: ${CLIENT_ASSET_DIRS.join(", ")}`,
  );
  process.exit(2);
}

let scanned = 0;
for (const dir of assetDirs) {
  for (const file of walk(dir)) {
    if (!/\.(js|mjs|css|json|map)$/.test(file)) continue;
    scanned += 1;
    const text = fs.readFileSync(file, "utf8");
    const rel = file.split(path.sep).join("/");
    if (text.includes(SENTINEL)) {
      failures.push(`${rel} contains ${SENTINEL}: a src/server/ module was bundled for the browser.`);
    }
    // Turbopack and webpack both keep module paths in .map files; a path in a
    // .js chunk means the module itself was included.
    if (/src\/server\//.test(text) && !file.endsWith(".map")) {
      failures.push(`${rel} mentions src/server/: server code reached the client bundle.`);
    }
  }
}

notes.push(`Scanned ${scanned} client assets in ${assetDirs.join(", ")}.`);

for (const note of notes) console.log(`note: ${note}`);

if (failures.length) {
  console.error(`\nserver-only check FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`\nserver-only check passed: ${SERVER_DIR}/ does not reach the browser.`);
