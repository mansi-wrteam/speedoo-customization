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
import BlogsPageStatic from "@/components/pagecomponents/BlogsPage";
import { withSettingsSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import { loadBlogs } from "@/server/pageData";
import React from "react";
import type { SeoProps } from "@/types/seo";
import dynamic from "next/dynamic";
// Body server-rendered from SSR_PLAN.md phase 4; its data arrives as
// `serverData` and the component uses it as its initial state.
const BlogsPageLazy = dynamic(() => import("@/components/pagecomponents/BlogsPage"), { ssr: false });
const BlogsPage = SSR_MODE ? BlogsPageStatic : BlogsPageLazy;

import MetaData from "@/components/metadata-component/MetaData";


export const getServerSideProps = withSettingsSeo("blogs", { body: true, loader: loadBlogs });

const index = ({
  title,
  description,
  keywords,
  schemaMarkup,
  ogImage,
  favicon,
}: SeoProps) => {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/blogs`;
  return (
    <div>
      <MetaData
        title={title}
        description={description}
        keywords={keywords}
        structuredData={schemaMarkup}
        ogImage={ogImage}
        pageName="/blogs"
        ogUrl={pageUrl}
        favicon={favicon}
      />
      <BlogsPage />
    </div>
  );
};

export default index;