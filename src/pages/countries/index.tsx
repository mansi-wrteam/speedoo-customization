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
import CountriesPageStatic from "@/components/pagecomponents/CountriesPage";
import { SSR_MODE } from "@/config/renderMode";
import { withPageData } from "@/server/withSsr";
import { loadCountries } from "@/server/pageData";
import MetaData from '@/components/metadata-component/MetaData'
// Body server-rendered from SSR_PLAN.md phase 5. This page had no
// getServerSideProps at all before, so it moves from `○` to `ƒ` in the standalone
// route table — one of the plan's three expected route-table changes.
const CountriesPageLazy = dynamic(() => import("@/components/pagecomponents/CountriesPage"), { ssr: false });
const CountriesPage = SSR_MODE ? CountriesPageStatic : CountriesPageLazy
import dynamic from 'next/dynamic'
import React from 'react'

const index = () => {
    return (
        <>
            <MetaData pageName="/countries" title={`Countries - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
            <CountriesPage />
        </>
    )
}

export default index

export const getServerSideProps = withPageData(loadCountries);
