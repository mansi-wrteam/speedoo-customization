import { useEffect } from "react";
import { useLocalizedRouter } from "@/utils/localizedNav";
import Loader from "@/components/loader/Loader";

export interface RedirectToProps {
  /** Path on this site to land on, without the language prefix. */
  to: string;
}

/**
 * A path the app shares that this site serves under another name
 * (WEB_PARITY_V4.0.2 §12.1).
 *
 * Redirects on the client rather than in `getServerSideProps`, because the
 * static export has no server to redirect from and both deploy modes have to
 * keep working. `replace`, so Back does not bounce the visitor straight out
 * again.
 */
const RedirectTo = ({ to }: RedirectToProps) => {
  const router = useLocalizedRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return <Loader />;
};

export default RedirectTo;
