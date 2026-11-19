// Serves the static export the way Apache will, so `out/` can be tested locally.
//
// A plain static server is NOT good enough. The export writes dynamic routes as
// files named after the route pattern — `product/[slug].html`,
// `categories/[...slug].html` — and `.htaccess` is what maps a real URL onto
// them. Without those rewrites `/product/fresh-tomatoes` 404s locally while
// working perfectly in production, so testing `out/` with `npx serve` tells you
// nothing useful.
//
// The rules below mirror .htaccess. If you change one, change both.
//
// Usage:
//   NEXT_PUBLIC_SEO=false npx next build && node scripts/copy-assets.js
//   node scripts/serve-out.mjs 8080
//   # then open http://127.0.0.1:8080
import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("out");
const port = Number(process.argv[2] || 8080);

if (!fs.existsSync(ROOT)) {
  console.error(`No out/ folder. Build it first:\n  NEXT_PUBLIC_SEO=false npx next build && node scripts/copy-assets.js`);
  process.exit(2);
}

// Mirrors the RewriteRules in .htaccess, in the same order.
const REWRITES = [
  [/^\/profile\/?$/, "/profile.html"],
  [/^\/categories\/?$/, "/404.html"],
  [/^\/categories\/.+$/, "/categories/[...slug].html"],
  [/^\/blog\/[^/]+\/?$/, "/blog/[slug].html"],
  [/^\/order-detail\/?$/, "/order-detail.html"],
  [/^\/order-detail\/[^/]+\/?$/, "/order-detail/[orderid].html"],
  [/^\/product\/?$/, "/products.html"],
  [/^\/product\/[^/]+\/?$/, "/product/[slug].html"],
  [/^\/profile\/orderhistory\/?$/, "/profile/orderhistory.html"],
  [/^\/profile\/orderhistory\/[^/]+\/?$/, "/profile/orderhistory/[orderid].html"],
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

// Keep the resolved path inside out/, so a crafted URL cannot read the disk.
const safeJoin = (rel) => {
  const full = path.join(ROOT, decodeURIComponent(rel));
  return full.startsWith(ROOT) ? full : null;
};

const fileFor = (pathname) => {
  // 1. an existing file or directory wins, exactly as .htaccess does first
  const direct = safeJoin(pathname);
  if (direct && fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  const asHtml = safeJoin(`${pathname.replace(/\/$/, "")}.html`);
  if (asHtml && fs.existsSync(asHtml)) return asHtml;
  const asIndex = safeJoin(path.join(pathname, "index.html"));
  if (asIndex && fs.existsSync(asIndex)) return asIndex;

  // 2. the dynamic-route rewrites
  for (const [pattern, target] of REWRITES) {
    if (!pattern.test(pathname)) continue;
    const mapped = safeJoin(target);
    if (mapped && fs.existsSync(mapped)) return mapped;
  }

  // 3. SPA fallback, as in .htaccess
  const fallback = safeJoin("/index.html");
  return fallback && fs.existsSync(fallback) ? fallback : null;
};

createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = fileFor(pathname);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving out/ with .htaccess rewrites on http://127.0.0.1:${port}`);
});
