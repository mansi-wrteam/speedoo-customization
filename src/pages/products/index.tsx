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
import ProductsPageStatic from "@/components/pagecomponents/Productspage";
import { withSettingsSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import { loadProducts } from "@/server/pageData";
import React from "react";
import type { SeoProps } from "@/types/seo";
// Body server-rendered from SSR_PLAN.md phase 6; the unfiltered first page
// arrives as React Query `initialData`.
const ProductsPageLazy = dynamic(() => import("@/components/pagecomponents/Productspage"), { ssr: false });
const ProductsPage = SSR_MODE ? ProductsPageStatic : ProductsPageLazy;
import MetaData from "@/components/metadata-component/MetaData";
import dynamic from "next/dynamic";

export const getServerSideProps = withSettingsSeo("products", { body: true, loader: loadProducts });



const Products = ({ title, description, keywords, schemaMarkup, ogImage, favicon }: SeoProps) => {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/products`;

  return (
    <>
      <MetaData
        pageName="/products"
        title={title}
        description={description}
        keywords={keywords}
        structuredData={schemaMarkup}
        ogImage={ogImage}
        ogUrl={pageUrl}
        favicon={favicon}
      />
      <ProductsPage />
    </>
  );
};

export default Products;
