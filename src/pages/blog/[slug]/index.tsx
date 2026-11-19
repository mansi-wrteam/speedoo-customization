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
import BlogDetailPageStatic from "@/components/pagecomponents/BlogDetailPage";
import { withBlogSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import React from "react";
import dynamic from "next/dynamic";
// Body server-rendered from SSR_PLAN.md phase 4; its data arrives as
// `serverData` and the component uses it as its initial state.
const BlogDetailPageLazy = dynamic(() => import("@/components/pagecomponents/BlogDetailPage"), { ssr: false });
const BlogDetailPage = SSR_MODE ? BlogDetailPageStatic : BlogDetailPageLazy;

import MetaData from "@/components/metadata-component/MetaData";
import type { DetailSeoProps } from "@/types/seo";

export const getServerSideProps = withBlogSeo({ body: true });

const index = ({
  slug,
  metaKeywords,
  metaTitle,
  metaDescription,
  markUpSchema,
  og_image,
  favicon,
}: DetailSeoProps) => {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/blog/${slug}`;
  return (
    <div>
      <MetaData
        pageName="/blogs/all"
        title={metaTitle}
        keywords={metaKeywords}
        description={metaDescription}
        structuredData={markUpSchema}
        ogUrl={pageUrl}
        ogImage={og_image}
        favicon={favicon}
      />
      <BlogDetailPage />
    </div>
  );
};

export default index;
