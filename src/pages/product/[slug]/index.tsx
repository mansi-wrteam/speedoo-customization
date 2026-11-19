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
import ProductDescriptionPageStatic from "@/components/pagecomponents/ProductDescriptionPage";
import { withProductSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import React from "react";
// const SocialPages = dynamic(() => import('@/components/commonComponents/SocialPages'), { ssr: false })
import dynamic from "next/dynamic";
// Body server-rendered from SSR_PLAN.md phase 6; the product arrives as React
// Query `initialData`.
const ProductDescriptionPageLazy = dynamic(() => import("@/components/pagecomponents/ProductDescriptionPage"), { ssr: false });
const ProductDescriptionPage = SSR_MODE ? ProductDescriptionPageStatic : ProductDescriptionPageLazy;
import MetaData from "@/components/metadata-component/MetaData";
import type { ProductSeoProps } from "@/types/seo";

export const getServerSideProps = withProductSeo({ body: true });



export default function Index({
  slug,
  title,
  description,
  keywords,
  og_image,
  schemaMarkup,
  favicon
}: ProductSeoProps) {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/product/${slug}`;
  return (
    <>
      <MetaData
        pageName="/product/"
        title={title}
        description={description}
        keywords={keywords}
        structuredData={schemaMarkup}
        ogUrl={pageUrl}
        ogImage={og_image}
        favicon={favicon}
      />
      <ProductDescriptionPage />
    </>
  );
}
