// Fails when a build's route table differs from the recorded one. Routes are a
// hard constraint (no URL may change), so CI runs this after both builds.
//
//   npm run build 2>&1 | tee build.log
//   node scripts/check-routes.mjs build.log migration-baseline/build/standalone-routes.txt
//
// Compares the route paths and their render mode (○ static, ƒ server), not
// sizes, which change with every code edit.
import fs from "node:fs";

const routes = (text) => {
  const table = text.slice(Math.max(0, text.indexOf("Route (pages)")));
  return table
    .split("\n")
    .map((line) => line.match(/^[┌├└] [○ƒ ] ?\/\S*|^[┌├└] {3}\/_app/)?.[0].slice(2))
    .filter(Boolean);
};

const [logFile, baselineFile] = process.argv.slice(2);
if (!logFile || !baselineFile) {
  console.error("usage: node scripts/check-routes.mjs <build.log> <baseline-routes.txt>");
  process.exit(2);
}

const actual = routes(fs.readFileSync(logFile, "utf8"));
const expected = routes(fs.readFileSync(baselineFile, "utf8"));
const missing = expected.filter((r) => !actual.includes(r));
const added = actual.filter((r) => !expected.includes(r));

if (!actual.length) {
  console.error(`No route table found in ${logFile}.`);
  process.exit(1);
}
if (missing.length || added.length || actual.join("\n") !== expected.join("\n")) {
  console.error(`Route table differs from ${baselineFile}:`);
  missing.forEach((r) => console.error(`  - ${r}`));
  added.forEach((r) => console.error(`  + ${r}`));
  if (!missing.length && !added.length) console.error("  (same routes, different order)");
  process.exit(1);
}
console.log(`Routes unchanged: ${actual.length} entries match ${baselineFile}.`);
