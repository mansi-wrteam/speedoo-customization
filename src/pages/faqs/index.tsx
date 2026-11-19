import { withSettingsSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import { loadFaqs } from "@/server/pageData";
import MetaData from "@/components/metadata-component/MetaData";
import type { SeoProps } from "@/types/seo";
// Body server-rendered from SSR_PLAN.md phase 4; its data arrives as
// `serverData` and the component uses it as its initial state.
// The page body is imported STATICALLY for the server-rendered build and lazily
// for the static export. `next/dynamic` with `ssr: true` does not survive
// hydration here: the chunk is not resolved on the browser's FIRST render, so
// React finds nothing where the server put the body, discards the server markup
// and re-renders the whole tree on the client — error #418 on every page, with
// the SSR work thrown away. A static import has the component in hand before
// hydration starts.
//
// `SSR_MODE` is a compile-time literal, so the static export folds this to the
// `dynamic(..., { ssr: false })` branch it has always used — which is what keeps
// the body OUT of the exported HTML.
import FAQsPageStatic from "@/components/pagecomponents/FAQsPage";
const FAQsPageLazy = dynamic(() => import("@/components/pagecomponents/FAQsPage"), { ssr: false });
const FAQsPage = SSR_MODE ? FAQsPageStatic : FAQsPageLazy;
import dynamic from "next/dynamic";
import React from "react";


export const getServerSideProps = withSettingsSeo("faqs", { body: true, loader: loadFaqs });


const index = ({ title, description, keywords, schemaMarkup, ogImage, favicon }: SeoProps) => {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/faqs`;

  return (
    <div>
      <MetaData
        pageName="/faqs"
        title={title}
        description={description}
        keywords={keywords}
        structuredData={schemaMarkup}
        ogImage={ogImage}
        ogUrl={pageUrl}
        favicon={favicon}
      />
      <FAQsPage />
    </div>
  );
};

export default index;
