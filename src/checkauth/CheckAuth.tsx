import { useEffect, useState } from "react"
import type { ComponentType } from "react"
import { useLocalizedRouter } from "@/utils/localizedNav"
import { useSelector } from "react-redux";
import Loader from "@/components/loader/Loader";
import type { RootState } from "@/types/state";

const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
    const Wrapper = (props: P) => {
        const router = useLocalizedRouter();
        const user = useSelector((state: RootState) => state.User)
        const [isAuthorized, setIsAuthorized] = useState(false);
        const [authChecked, setAuthChecked] = useState(false)

        useEffect(() => {
            const privateRoutes = ['/profile', '/checkout', '/profile/address', '/profile/activeorders', '/profile/orderhistory', '/profile/wishlist', '/profile/wallethistory', "/profile/transaction", '/profile/notifications', '/profile/subscription'];
            const isPrivateRoute = privateRoutes.includes(router.pathname);

            if (isPrivateRoute && !user?.jwtToken) {
                router.push("/");
            } else if (router.pathname === "/profile/subscription" && !user?.user?.is_subscription_plans) {
                router.push("/");
            } else {
                setIsAuthorized(true)
            }
            setAuthChecked(true)
            // Only what the check reads: the router object is new on every render,
            // so depending on it re-ran this (and router.push) after each render.
        }, [user?.jwtToken, user?.user?.is_subscription_plans, router.pathname])
        if (!authChecked) {
            return <Loader screen="full" />;
        }

        return isAuthorized ? <WrappedComponent {...props} /> : null;
    }
    return Wrapper;
}

export default withAuth;