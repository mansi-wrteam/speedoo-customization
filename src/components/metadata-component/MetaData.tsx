import React from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import Head from "next/head";
import type { RootState } from "@/types/state";

/**
 * SEO head tags. Pages pass these from getServerSideProps (SEO mode), where a
 * missing value arrives as `null` rather than `undefined` — so it skips the
 * default below. React omits a `null` attribute, which is why those values are
 * handed to `<meta content>` with a non-null assertion.
 */
export interface MetaDataProps {
  // Basic SEO
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  author?: string;
  /** Path appended to NEXT_PUBLIC_BASE_URL for the default og:url. */
  pageName?: string;

  // Open Graph / Facebook
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  ogUrl?: string;
  siteName?: string;

  // Twitter
  twitterCard?: string;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;
  twitterSite?: string;
  twitterCreator?: string;

  // Additional SEO
  canonicalUrl?: string;
  robots?: string;
  themeColor?: string;

  /** JSON-LD string, rendered into a `<script type="application/ld+json">`. */
  structuredData?: string | null;

  // PWA (currently not rendered)
  manifestUrl?: string;
  appleTouchIcon?: string;
  /** Falls back to the settings favicon when empty. */
  favicon?: string | null;
}

const MetaData = ({
  // Basic SEO
  title = process.env.NEXT_PUBLIC_META_TITLE,
  description = process.env.NEXT_PUBLIC_META_DESCRIPTION,
  keywords = process.env.NEXT_PUBLIC_META_KEYWORDS,
  author = process.env.NEXT_PUBLIC_WEB_NAME, // Using app name as author
  pageName = "", // To append to base URL

  // Open Graph / Facebook - Using same as basic meta for consistency
  ogTitle = title,
  ogDescription = description,
  ogImage = "/favicon.ico", // Using favicon as default OG image
  ogUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${pageName}`,
  siteName = process.env.NEXT_PUBLIC_META_TITLE,

  // Twitter - Using same as OG for consistency
  twitterCard = "summary_large_image",
  twitterTitle = ogTitle,
  twitterDescription = ogDescription,
  twitterImage = ogImage,
  twitterSite = `@${process.env.NEXT_PUBLIC_META_TITLE}`,
  twitterCreator = `@${process.env.NEXT_PUBLIC_META_TITLE}`,

  // Additional SEO — defaults to the actual page URL (self-referencing) below.
  canonicalUrl,
  robots = "index, follow",
  themeColor = "#000000",

  // Structured Data
  structuredData = null,

  // PWA
  manifestUrl = "/manifest.json",
  appleTouchIcon = "/favicon.ico",
  favicon,
}: MetaDataProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const selectedLanguage = useSelector((state: RootState) => state.Language.selectedLanguage);
  const language = selectedLanguage?.code || "en";
  const router = useRouter();

  // Self-referencing canonical = the actual page URL (keeps ?module_id and ?lang
  // so canonical and the real URL match). A page can still override via the
  // canonicalUrl prop. Hash fragments are stripped.
  const asPath = (router?.asPath || pageName || "").split("#")[0];
  const resolvedCanonical =
    canonicalUrl || `${process.env.NEXT_PUBLIC_BASE_URL}${asPath}`;

  // hreflang alternates. Without these, the ?lang= variants look like duplicate
  // pages to Google rather than translations of one another, and it picks one
  // itself — usually not the one you want. `x-default` points at the URL with no
  // ?lang, which is what a first-time visitor gets.
  const availableLanguages = useSelector(
    (state: RootState) => state.Language.availableLanguages,
  );
  const pathWithoutLang = asPath.split("?")[0];
  const queryWithoutLang = asPath.includes("?")
    ? asPath
        .split("?")[1]
        .split("&")
        .filter((pair) => pair && !pair.startsWith("lang="))
        .join("&")
    : "";
  const altBase = `${process.env.NEXT_PUBLIC_BASE_URL}${pathWithoutLang}`;
  const altSuffix = queryWithoutLang ? `?${queryWithoutLang}&` : "?";
  const alternates = (availableLanguages ?? [])
    .map((l) => l?.code)
    .filter((code): code is string => Boolean(code));

  let finalFavicon =
    favicon == "" || favicon == undefined ? setting?.favicon : favicon;

  return (
    <Head>
      {/* Basic SEO */}
      <title>{title}</title>
      <meta name="description" content={description!} />
      <meta name="keywords" content={keywords!} />
      <meta name="author" content={author} />
      <meta name="robots" content={robots} />
      <meta name="language" content={language} />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle!} />
      <meta property="og:description" content={ogDescription!} />
      <meta property="og:image" content={ogImage!} />

      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={twitterTitle!} />
      <meta name="twitter:description" content={twitterDescription!} />
      <meta name="twitter:image" content={twitterImage!} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />

      {/* Canonical URL */}
      <link rel="canonical" href={resolvedCanonical} />
      {alternates.map((code) => (
        <link
          key={code}
          rel="alternate"
          hrefLang={code}
          href={`${altBase}${altSuffix}lang=${code}`}
        />
      ))}
      {alternates.length > 0 && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${altBase}${queryWithoutLang ? `?${queryWithoutLang}` : ""}`}
        />
      )}

      {/* Theme Color */}
      <meta name="theme-color" content={themeColor} />

      {/* PWA */}
      {/* <link rel="manifest" href={manifestUrl} />
      <link rel="apple-touch-icon" href={appleTouchIcon} /> */}

      <link rel="icon" href={finalFavicon ? finalFavicon : "/favicon.ico"} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={title!} />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />

      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
          key="structured-data"
        />
      )}
    </Head>
  );
};

export default MetaData;
