/**
 * PM2 Ecosystem Configuration for Next.js Standalone Deployment
 *
 * This configuration is used with the standalone output mode.
 * After running `npm run build`, the standalone server is available at:
 * .next/standalone/server.js
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload egrocer-web      # zero-downtime, needs cluster mode
 *   pm2 restart egrocer-web
 *   pm2 stop egrocer-web
 *   pm2 delete egrocer-web
 *
 * ── Sizing ───────────────────────────────────────────────────────────────────
 *
 * These numbers come from `node scripts/load-test.mjs`, not from a guess.
 * Measured on an 8-core / 8 GB box against the live API, AFTER the server-side
 * `gcTime` fix in src/pages/_app.tsx:
 *
 *   conc  requests  fail   rps    p50      p95      rss
 *      1        41     0    1.7   309ms   1407ms   229 MB
 *      5       175     0    7.3   380ms   2128ms   443 MB
 *     10       224     0    9.3   584ms   3775ms   617 MB
 *     25       140     0    5.8  4779ms   7969ms   467 MB
 *     50       279     0   11.6  4527ms   8041ms   584 MB
 *
 *   10-minute soak at concurrency 10: 0 failed, peak 1099 MB,
 *   floor 373 MB -> 113 MB (memory is returned, nothing retained).
 *
 * Three things decide the configuration:
 *
 * 1. Throughput plateaus around 9-11 rps while latency keeps climbing. The
 *    bottleneck is the UPSTREAM API, not this process's CPU — each render waits
 *    on several calls to NEXT_PUBLIC_API_URL. Adding workers therefore buys far
 *    less than the core count suggests, and `instances: "max"` would mostly
 *    multiply memory and upstream load.
 *
 * 2. The heap is capped deliberately. Uncapped, V8 on a large host lets RSS
 *    reach 2 GB before collecting, which makes memory behaviour depend on how
 *    much RAM the host happens to have — the dev box and the VPS would behave
 *    differently. 1536 MB was validated end to end: load to concurrency 50 plus
 *    a 10-minute soak, no OOM, no failed requests. Do NOT lower it casually:
 *    512 MB dies with "Reached heap limit Allocation failed".
 *
 * 3. `max_memory_restart` sits ABOVE the measured 1099 MB peak. The value this
 *    file used to carry was 500M — below what the server reaches under normal
 *    load — so PM2 would have restarted it, and dropped every in-flight render,
 *    under exactly the traffic it exists to survive.
 *
 * Re-run the measurement on the real VPS before trusting any of it:
 *
 *   PID=$(pgrep -f standalone/server.js | head -1)
 *   node scripts/load-test.mjs http://localhost:8001 --mode=load --minutes=2  --pid=$PID
 *   node scripts/load-test.mjs http://localhost:8001 --mode=soak --minutes=60 --pid=$PID
 *
 * Read the soak's FLOOR, not its first-and-last samples: RSS is a sawtooth that
 * swings by a gigabyte within one run, and comparing endpoints of a sawtooth
 * reports leaks that are not there and hides ones that are.
 *
 * With `instances: 2` this needs roughly 3 GB of headroom. On a VPS with less
 * than that, set `instances: 1` — and accept that `pm2 reload` then has a brief
 * gap instead of being seamless.
 */
module.exports = {
    apps: [
        {
            name: "egrocer-web",
            script: ".next/standalone/server.js",
            cwd: "./",
            // Two, not `"max"`. Cluster mode is worth having even at this count
            // because it is what makes `pm2 reload` zero-downtime: one worker
            // keeps serving while the other restarts. A third and fourth would
            // each add ~600 MB and another copy of the in-process TTL cache
            // (src/server/cache.ts), which means another set of upstream calls
            // for settings, theme, modules and languages every SSR_CACHE_TTL.
            //
            // Safe to cluster: there is no shared server state. Every request
            // builds its own Redux store inside its own AsyncLocalStorage scope
            // (SSR_PLAN.md §3.2), and no session lives in the process, so no
            // sticky routing is needed.
            instances: 2,
            exec_mode: "cluster",
            // Pin the heap so memory behaviour is the same on the VPS as it is
            // on a developer machine. See point 2 of the sizing note.
            node_args: ["--max-old-space-size=1536"],
            env: {
                NODE_ENV: "production",
                PORT: 8001,
                HOSTNAME: "0.0.0.0",
                // Pinned so server-rendered dates match what the browser would
                // have produced. Without it the server formats in whatever zone
                // the host happens to use, and the date flips on hydration
                // (SSR_PLAN.md §5).
                TZ: "Asia/Kolkata"
            },
            // Restart on file changes (disabled for production)
            watch: false,
            // Above the 1099 MB peak the 10-minute soak measured, and below
            // what the 1536 MB heap cap can reach — so PM2 catches a genuinely
            // runaway worker without touching a healthy busy one. The old value
            // was 500M, under the normal working set.
            max_memory_restart: "1400M",
            // Let an in-flight server render finish instead of cutting it off
            // mid-response. p99 was ~8s under heavy load, so 10s covers it.
            kill_timeout: 10000,
            // Don't count a worker as "up" until it can actually serve.
            listen_timeout: 10000,
            // Logging
            error_file: "./logs/pm2-error.log",
            out_file: "./logs/pm2-out.log",
            log_file: "./logs/pm2-combined.log",
            time: true,
            // Restart behavior
            autorestart: true,
            max_restarts: 10,
            restart_delay: 5000
        }
    ]
};
