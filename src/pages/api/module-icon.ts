// Serves an admin-uploaded SVG from the app's own origin.
//
// The asset host sends no Access-Control-Allow-Origin, so the browser refuses
// to read those files — and an icon that can't be read can't be recoloured, nor
// used as a CSS mask. Re-serving the bytes here makes them same-origin, which
// is the case MaskedIcon already handles.
//
// Only assets on the configured API host are proxied: forwarding arbitrary
// user-supplied URLs would turn this route into an SSRF hop.
import type { NextApiRequest, NextApiResponse } from "next";

const ALLOWED_ORIGIN = (() => {
  try {
    // An unset env var makes new URL() throw → caught → null.
    return new URL(process.env.NEXT_PUBLIC_API_URL as string).origin;
  } catch {
    return null;
  }
})();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  let target;
  try {
    // A missing ?url makes new URL(undefined) throw → 400 below.
    target = new URL(Array.isArray(url) ? url[0] : url!);
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }

  if (!ALLOWED_ORIGIN || target.origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: "origin not allowed" });
  }

  try {
    const upstream = await fetch(target.toString());
    if (!upstream.ok) {
      return res.status(502).json({ error: "upstream error" });
    }
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.includes("svg")) {
      return res.status(415).json({ error: "not an svg" });
    }
    const markup = await upstream.text();
    res.setHeader("Content-Type", "image/svg+xml");
    // These rarely change, and a miss only costs a tint.
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.status(200).send(markup);
  } catch {
    return res.status(502).json({ error: "fetch failed" });
  }
}
