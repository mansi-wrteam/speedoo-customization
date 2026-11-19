import Document, { Html, Head, Main, NextScript } from "next/document";
import { SSR_MODE } from "@/config/renderMode";
import type { DocumentContext, DocumentInitialProps } from "next/document";

// `_document` never reaches the browser, so importing server code here is safe —
// and scripts/verify-server-only.mjs proves it against the built chunks.
import { readRequestScope, runWithRequestStore } from "@/server/requestStore";
import type { RequestContext } from "@/server/context";

interface EgrocerDocumentProps extends DocumentInitialProps {
  langCode: string;
  /**
   * null when no request resolved a direction — which is every page of the
   * static export. The attribute is then omitted entirely, so `out/` keeps
   * emitting exactly `<html lang="en">` as it always has (SSR_PLAN.md
   * constraint 2). compare-html.mjs now compares these attributes, so that
   * claim is checked rather than assumed.
   */
  dir: "ltr" | "rtl" | null;
}

export default class EgrocerDocument extends Document<EgrocerDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<EgrocerDocumentProps> {
    // `ctx.req` is undefined for a prerendered page, which is every page in the
    // static export. Nothing below runs in that build, so `out/` is unchanged.
    const scope = SSR_MODE ? readRequestScope<RequestContext>(ctx.req) : undefined;

    if (scope) {
      // The whole React render happens inside `renderPage`. Wrapping it in the
      // request's AsyncLocalStorage scope is what makes `getActiveStore()`
      // return THIS request's store while the tree renders — so `t()`, the
      // currency formatter and the axios interceptors cannot read another
      // request's language or token. See SSR_PLAN.md §3.2 and server/requestStore.
      const originalRenderPage = ctx.renderPage;
      ctx.renderPage = () => runWithRequestStore(scope.store, () => originalRenderPage());
    }

    const initialProps = await Document.getInitialProps(ctx);

    return {
      ...initialProps,
      // Server-rendered per request, where today the client fixed these up after
      // mount (Layout sets documentElement.lang/dir in an effect). A crawler
      // never ran that effect.
      langCode: scope?.context.langCode ?? "en",
      dir: scope?.context.dir ?? null,
    };
  }

  render() {
    const { langCode, dir } = this.props;
    return (
      // suppressHydrationWarning: next-themes writes the theme class onto <html>
      // before React hydrates, and Layout still corrects lang/dir on the client.
      <Html lang={langCode} {...(dir ? { dir } : {})} suppressHydrationWarning>
        <Head>
          {/* Typeface is loaded via next/font in _app.js — self-hosted, no external request. */}


          {/*
          <script
            async
            defer
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAP_API}&libraries=places&loading=async`}
          ></script>
          */}
        </Head>
        <body className="antialiased !pointer-events-auto">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
