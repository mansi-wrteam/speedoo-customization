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
import CancellationPolicyPageStatic from "@/components/pagecomponents/CancellationPolicyPage";
import { withSettingsSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import MetaData from "@/components/metadata-component/MetaData";
import type { SeoProps } from "@/types/seo";
// Body server-rendered from SSR_PLAN.md phase 4. This page's content comes
// straight from `state.Setting.setting`, which the request context already
// seeds, so it needs no loader of its own. `SSR_MODE` is a compile-time literal,
// so the static export still emits `ssr: false`.
const CancellationPolicyPageLazy = dynamic(() => import("@/components/pagecomponents/CancellationPolicyPage"), { ssr: false });
const CancellationPolicyPage = SSR_MODE ? CancellationPolicyPageStatic : CancellationPolicyPageLazy;

import dynamic from "next/dynamic";
import React from "react";


export const getServerSideProps = withSettingsSeo("cancellation-policy", { body: true });

const index = ({
  title,
  description,
  keywords,
  ogImage,
  schemaMarkup,
  favicon,
}: SeoProps) => {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/cancellation-policy`;
  return (
    <div>
      <MetaData
        pageName="/cancellation-policy"
        title={title}
        description={description}
        keywords={keywords}
        structuredData={schemaMarkup}
        ogImage={ogImage}
        favicon={favicon}
      />
      <CancellationPolicyPage />
    </div>
  );
};

export default index;
