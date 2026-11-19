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
import SellersPageStatic from "@/components/pagecomponents/SellersPage";
import { SSR_MODE } from "@/config/renderMode";
import { withPageData } from "@/server/withSsr";
import { loadSellers } from "@/server/pageData";
import MetaData from '@/components/metadata-component/MetaData'
import dynamic from 'next/dynamic'
// Body server-rendered from SSR_PLAN.md phase 5. This page had no
// getServerSideProps at all before, so it moves from `○` to `ƒ` in the standalone
// route table — one of the plan's three expected route-table changes.
const SellersPageLazy = dynamic(() => import("@/components/pagecomponents/SellersPage"), { ssr: false });
const SellersPage = SSR_MODE ? SellersPageStatic : SellersPageLazy
import React from 'react'

const index = () => {
    return (
        <>
            <MetaData pageName="/sellers" title={`Sellers - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
            <SellersPage />
        </>
    )
}

export default index

export const getServerSideProps = withPageData(loadSellers);
