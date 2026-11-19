// Load and soak test for the standalone server.
//
// Two things this answers, which nothing else in the suite does:
//
//   1. LOAD — how latency and error rate behave as concurrency rises, so PM2
//      can be sized from a measurement rather than a guess.
//   2. SOAK — whether RSS grows over a sustained run. That matters here more
//      than usual: every request builds its own Redux store and runs inside an
//      AsyncLocalStorage scope (SSR_PLAN.md §3.2), and the TTL cache in
//      src/server/cache.ts is process-wide. A leak in either shows up as RSS
//      that climbs and never settles, and PM2's `max_memory_restart` would then
//      be papering over it.
//
// usage:
//   node scripts/load-test.mjs <baseUrl> [--mode=load|soak] [--minutes=N] [--pid=N]
//
// Exit 0 = within thresholds. 1 = a threshold was exceeded. 2 = bad usage.
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--"));
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};

if (!base) {
  console.error("usage: node scripts/load-test.mjs <baseUrl> [--mode=load|soak] [--minutes=N] [--pid=N]");
  process.exit(2);
}

const mode = arg("mode", "load");
const minutes = Number(arg("minutes", mode === "soak" ? 10 : 1));
const pid = arg("pid", null);

// A mix weighted the way real traffic is: the homepage and a product listing are
// the heavy server renders, the policy pages are the cheap ones.
const ROUTES = [
  "/?lang=en",
  "/products?lang=en",
  "/products?lang=en&module=food-delivery",
  "/categories/all?lang=en",
  "/categories/fruits-vegetables?lang=en",
  "/product/fresh-tomatoes?lang=en",
  "/blogs?lang=en",
  "/about-us?lang=en",
  "/privacy-policy?lang=en",
  "/?lang=ar",
];

/** RSS of the server process, in MB. Only available when --pid is given. */
const rssMb = () => {
  if (!pid) return null;
  try {
    const out = execSync(`ps -o rss= -p ${pid}`, { encoding: "utf8" }).trim();
    return out ? Math.round(Number(out) / 1024) : null;
  } catch {
    return null;
  }
};

const percentile = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0;

/** Fires `concurrency` workers for `durationMs`, each looping over the mix. */
const run = async (concurrency, durationMs) => {
  const latencies = [];
  let done = 0;
  let failed = 0;
  const deadline = Date.now() + durationMs;

  const worker = async (seed) => {
    let i = seed;
    while (Date.now() < deadline) {
      const route = ROUTES[i++ % ROUTES.length];
      const started = performance.now();
      try {
        const response = await fetch(base + route);
        // Read the body: a server render is not "done" until it is streamed out,
        // and ignoring it would measure time-to-first-byte and call it latency.
        await response.text();
        if (!response.ok) failed++;
      } catch {
        failed++;
      }
      latencies.push(performance.now() - started);
      done++;
    }
  };

  await Promise.all(Array.from({ length: concurrency }, (_, n) => worker(n)));
  latencies.sort((a, b) => a - b);
  return {
    concurrency,
    requests: done,
    failed,
    rps: +(done / (durationMs / 1000)).toFixed(1),
    p50: Math.round(percentile(latencies, 50)),
    p95: Math.round(percentile(latencies, 95)),
    p99: Math.round(percentile(latencies, 99)),
    max: Math.round(latencies[latencies.length - 1] ?? 0),
  };
};

console.log(`${mode} test against ${base}`);
if (pid) console.log(`watching pid ${pid}, RSS now ${rssMb()} MB`);
console.log();

let failures = 0;

if (mode === "load") {
  console.log("conc  requests  fail   rps    p50     p95     p99     max   rss");
  for (const concurrency of [1, 5, 10, 25, 50]) {
    const r = await run(concurrency, minutes * 60_000 / 5);
    const rss = rssMb();
    console.log(
      `${String(r.concurrency).padStart(4)}  ${String(r.requests).padStart(8)}  ${String(r.failed).padStart(4)}  ` +
      `${String(r.rps).padStart(5)}  ${String(r.p50).padStart(5)}ms  ${String(r.p95).padStart(5)}ms  ` +
      `${String(r.p99).padStart(5)}ms  ${String(r.max).padStart(5)}ms  ${rss ?? "-"}`,
    );
    if (r.failed > 0) failures++;
  }
} else {
  // Steady moderate load, sampled every 30s, so a climbing RSS is visible as a
  // trend rather than as one number at the end.
  const samples = [];
  const started = Date.now();
  const total = minutes * 60_000;
  const slice = 30_000;
  console.log("elapsed  requests  fail   rps    p50     p95   rss");
  while (Date.now() - started < total) {
    const r = await run(10, Math.min(slice, total - (Date.now() - started)));
    const rss = rssMb();
    samples.push({ t: Math.round((Date.now() - started) / 1000), rss, ...r });
    console.log(
      `${String(samples.at(-1).t).padStart(6)}s  ${String(r.requests).padStart(8)}  ${String(r.failed).padStart(4)}  ` +
      `${String(r.rps).padStart(5)}  ${String(r.p50).padStart(5)}ms  ${String(r.p95).padStart(5)}ms  ${rss ?? "-"}`,
    );
    if (r.failed > 0) failures++;
  }

  const withRss = samples.filter((s) => s.rss != null);
  if (withRss.length >= 4) {
    const peak = Math.max(...withRss.map((s) => s.rss));
    const first = withRss[0].rss;
    const last = withRss.at(-1).rss;

    // RSS under load is a SAWTOOTH: it climbs until V8 feels pressure, collects,
    // and climbs again. Measured here it swings between ~320 MB and ~1480 MB
    // within a single run. So comparing the first sample to the last says
    // nothing — land on a peak and it reads as a 700 MB leak, land on a trough
    // and a real leak reads as a saving. That is exactly what this check did on
    // its first run, and it reported a leak that was not there.
    //
    // The signal that survives GC noise is the FLOOR: the lowest RSS the process
    // returns to. A leak raises the floor, because the retained bytes can never
    // be collected. A busy-but-healthy process has a floor that stays put, even
    // while its peaks move around.
    const half = Math.floor(withRss.length / 2);
    const floorOf = (slice) => Math.min(...slice.map((s) => s.rss));
    const earlyFloor = floorOf(withRss.slice(0, half));
    const lateFloor = floorOf(withRss.slice(half));
    const floorRise = lateFloor - earlyFloor;

    console.log(`\nRSS ${first} MB -> ${last} MB (peak ${peak} MB)`);
    console.log(
      `floor ${earlyFloor} MB (first half) -> ${lateFloor} MB (second half), ` +
      `${floorRise >= 0 ? "+" : ""}${floorRise} MB`,
    );
    console.log(`\nSet PM2 max_memory_restart ABOVE ${peak} MB, or load will restart a healthy worker.`);

    if (floorRise > 200) {
      console.log(`WARNING: the floor rose ${floorRise} MB — that is retained memory, not GC noise.`);
      failures++;
    }
  }
}

console.log(`\n${failures ? `${failures} window(s) outside thresholds` : "no failed requests, no runaway memory"}`);
process.exit(failures ? 1 : 0);
