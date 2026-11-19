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
import CategoriesPagesStatic from "@/components/pagecomponents/CategoriesPages";
import CategoryDetailPageStatic from "@/components/pagecomponents/CategoryDetailPage";
import { withCategorySeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import MetaData from "@/components/metadata-component/MetaData";
import type { DetailSeoProps } from "@/types/seo";

// All-categories grid (existing) vs the new category-detail page
const CategoriesPagesLazy = dynamic(() => import("@/components/pagecomponents/CategoriesPages"), { ssr: false });
const CategoriesPages = SSR_MODE ? CategoriesPagesStatic : CategoriesPagesLazy;
const CategoryDetailPageLazy = dynamic(() => import("@/components/pagecomponents/CategoryDetailPage"), { ssr: false });
const CategoryDetailPage = SSR_MODE ? CategoryDetailPageStatic : CategoryDetailPageLazy;

export const getServerSideProps = withCategorySeo({ body: true });

const Categories = ({
  slug,
  metaTitle,
  metaKeywords,
  metaDescription,
  markUpSchema,
  og_image,
  favicon,
}: DetailSeoProps<string[]>) => {
  const router = useRouter();
  // Prefer SSR prop; fall back to the client route (when SEO/getServerSideProps is off)
  const routeSlug = router.query.slug;
  const slugArr = Array.isArray(slug) && slug.length
    ? slug
    : Array.isArray(routeSlug)
      ? routeSlug
      : routeSlug
        ? [routeSlug]
        : [];
  const isAll = slugArr[0] === "all";
  const pathStr = slugArr.join("/");
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/categories/${pathStr}`;

  return (
    <div>
      <MetaData
        pageName="/categories/all"
        title={metaTitle}
        keywords={metaKeywords}
        description={metaDescription}
        structuredData={markUpSchema}
        ogUrl={pageUrl}
        ogImage={og_image}
        favicon={favicon}
      />
      {isAll ? <CategoriesPages /> : <CategoryDetailPage />}
    </div>
  );
};

export default Categories;