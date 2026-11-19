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
import HomePageStatic from "@/components/pagecomponents/Homepage";
import { withSettingsSeo } from "@/server/withSsr";
import { SSR_MODE } from "@/config/renderMode";
import { loadHome } from "@/server/pageData";
import MetaData from "@/components/metadata-component/MetaData";
import type { SeoProps } from "@/types/seo";
import dynamic from "next/dynamic";

const HomePageLazy = dynamic(() => import("@/components/pagecomponents/Homepage"), { ssr: false });
const HomePage = SSR_MODE ? HomePageStatic : HomePageLazy;


export const getServerSideProps = withSettingsSeo("home", { body: true, loader: loadHome });

export default function Home({
  title,
  description,
  keywords,
  ogImage,
  schemaMarkup,
  favicon,
}: SeoProps) {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}`;
  return (
    <>
      <MetaData
        title={title}
        description={description}
        keywords={keywords}
        pageName="/"
        structuredData={schemaMarkup}
        ogImage={ogImage}
        ogUrl={pageUrl}
        favicon={favicon}
      />
      <HomePage />
    </>
  );
}
