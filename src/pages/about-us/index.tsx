// The page body is imported STATICALLY for the server-rendered build and lazily
// for the static export. `next/dynamic` with `ssr: true` does not survive
// hydration here: the chunk is not resolved on the browser's FIRST render, so
// React finds nothing where the server put the body, discards the server markup
// and re-renders the whole tree on the client — error #418 on every page, with
// the SSR work thrown away. A static import has the component in hand before
// hydration starts.
//
// `SSR_MODE` is a compile-time literal, so the static export folds this to the
// `dynamic(..., { ssr: false })` branch it has always used and tree-shakes the
// static import away.
import AboutUsPageStatic from "@/components/pagecomponents/AboutUsPage";
import { withSettingsSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import MetaData from "@/components/metadata-component/MetaData";
import type { SeoProps } from "@/types/seo";
// First page whose BODY is server-rendered (SSR_PLAN.md phase 3b). `SSR_MODE` is
// a compile-time literal, so the static export still emits `ssr: false` — the
// exact code it has always had — while the VPS build renders the page on the
// server. AboutUs reads only `state.Setting.setting.about_us`, which the request
// context seeds, so it needs no client-only data.
const AboutUsPageLazy = dynamic(() => import("@/components/pagecomponents/AboutUsPage"), { ssr: false });
const AboutUsPage = SSR_MODE ? AboutUsPageStatic : AboutUsPageLazy;
import dynamic from "next/dynamic";
import React from "react";

export const getServerSideProps = withSettingsSeo("about-us", { body: true });

const Index = ({
  title,
  description,
  keywords,
  schemaMarkup,
  ogImage,
  favicon,
}: SeoProps) => {
  const currentURL = `${process.env.NEXT_PUBLIC_BASE_URL}/about-us`;
  return (
    <div>
      <MetaData
        pageName="/about"
        title={title}
        description={description}
        keywords={keywords}
        structuredData={schemaMarkup}
        ogImage={ogImage}
        ogUrl={currentURL}
        favicon={favicon}
      />
      <AboutUsPage />
    </div>
  );
};

export default Index;
