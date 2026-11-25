/** @type {import('next').NextConfig} */
const nextConfig = {

  images: {
    formats: ['image/avif', 'image/webp'],
    // Next 16 REJECTS any `quality` not listed here and falls back to the
    // default, with a build warning per image:
    //
    //   Image ... is using quality "95" which is not configured in
    //   images.qualities [75]
    //
    // Components already pass 85, 90 and 95 for the images a user looks at
    // closely (the logo, the footer marks, blog and offer art). Without this
    // list every one of those was silently served at 75 — which is why the
    // images looked worse than the code says they should.
    qualities: [75, 85, 90, 95],
    // 75 remains the DEFAULT for anything that does not ask. At the sizes this
    // UI renders, AVIF q75 is indistinguishable from the source and 58-83%
    // smaller.
    //
    // NOT TUNED HIGHER on product detail, because the hero image there does not
    // go through next/image at all: ProductZoomImage renders it via
    // react-image-magnify, which emits a raw <img>. So the one image a buyer
    // actually studies — and the likely LCP element on that page — is still
    // served unoptimised at full size. Worth fixing, but it is a component
    // change, not a config one. See SSR_PLAN.md §9a.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: new URL(process.env.NEXT_PUBLIC_API_URL).hostname,
        port: '',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: new URL(process.env.NEXT_PUBLIC_API_URL).hostname,
        port: '',
        pathname: '/public/storage/**',
      },
      {
        protocol: 'https',
        hostname: new URL(process.env.NEXT_PUBLIC_API_URL).hostname,
        port: '',
        pathname: '/images/**',
      }

    ],
    // Optimized in VPS mode, unoptimized in the static export.
    //
    // A static export has no server to resize anything, so `output: "export"`
    // REQUIRES unoptimized images. The standalone build does have one, and on a
    // product grid the images are the LCP element — a Core Web Vitals ranking
    // signal — so leaving them unoptimized there cost ranking for no benefit.
    //
    // This changes the emitted markup (srcset, /_next/image URLs), which is why
    // it waited until the SSR phases were verified by HTML diffing.
    // See SSR_PLAN.md decision 5.
    unoptimized: process.env.NEXT_PUBLIC_SEO !== "true"
  },

  experimental: {
    scrollRestoration: true,
  },
  // .htaccess is copied into out/ by scripts/copy-assets.js (postbuild);
  // exportPathMap is no longer used for that.
};

if (process.env.NEXT_PUBLIC_SEO === "true") {
  nextConfig.output = "standalone";
} else {
  nextConfig.output = "export";
}
export default nextConfig;
