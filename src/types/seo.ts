// Props that SEO pages get from getServerSideProps and hand to <MetaData>.
//
// getServerSideProps only exists in the VPS/standalone build
// (NEXT_PUBLIC_SEO == "true"). In the static export it is null, so the page
// renders with no props at all — which is why every field is optional, and an
// absent one falls back to MetaData's default. When a field is present it may
// be `null` (the pages use `|| null` fallbacks, since `undefined` cannot be
// serialized as JSON).

/** Settings-driven pages (home, blogs, products, contact-us, policies, ...). */
export interface SeoProps {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  /** JSON-LD for MetaData `structuredData`. */
  schemaMarkup?: string | null;
  ogImage?: string | null;
  favicon?: string | null;
}

/** `product/[slug]`: SeoProps plus the slug, with the image as `og_image`. */
export interface ProductSeoProps extends Omit<SeoProps, "ogImage"> {
  slug?: string;
  og_image?: string | null;
}

/**
 * `blog/[slug]` (slug: string) and `categories/[...slug]` (slug: string[]):
 * the same fields under their own names.
 */
export interface DetailSeoProps<TSlug = string> {
  slug?: TSlug;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  /** JSON-LD for MetaData `structuredData`. */
  markUpSchema?: string | null;
  og_image?: string | null;
  favicon?: string | null;
}
