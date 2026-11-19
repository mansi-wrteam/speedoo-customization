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
import ContactUsPageStatic from "@/components/pagecomponents/ContactUsPage";
import { withSettingsSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import MetaData from "@/components/metadata-component/MetaData";
import type { SeoProps } from "@/types/seo";
import dynamic from "next/dynamic";
// Body server-rendered from SSR_PLAN.md phase 4. This page's content comes
// straight from `state.Setting.setting`, which the request context already
// seeds, so it needs no loader of its own. `SSR_MODE` is a compile-time literal,
// so the static export still emits `ssr: false`.
const ContactUsPageLazy = dynamic(() => import("@/components/pagecomponents/ContactUsPage"), { ssr: false });
const ContactUsPage = SSR_MODE ? ContactUsPageStatic : ContactUsPageLazy;
import React from "react";

export const getServerSideProps = withSettingsSeo("contact-us", { body: true });

const index = ({
  title,
  description,
  keywords,
  schemaMarkup,
  ogImage,
  favicon,
}: SeoProps) => {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/contact-us`;

  return (
    <div>
      <MetaData
        title={title}
        description={description}
        keywords={keywords}
        structuredData={schemaMarkup}
        ogImage={ogImage}
        pageName="/contact-us"
        ogUrl={pageUrl}
        favicon={favicon}
      />
      <ContactUsPage />
    </div>
  );
};

export default index;
