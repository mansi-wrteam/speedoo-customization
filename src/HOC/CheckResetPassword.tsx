import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocalizedRouter } from "@/utils/localizedNav";
import type { RootState } from "@/types/state";

const CheckResetPassword = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const ResetPasswordWrapper = (props: P) => {
    const router = useLocalizedRouter();
    const [isAbleToReset, setIsAblseToReset] = useState(false);
    const authType = useSelector((state: RootState) => state.User.authType);
    const setting = useSelector((state: RootState) => state?.Setting?.setting);

    const passwordRoute = ["/profile/resetpassword"];
    const isPasswordRoute = passwordRoute.includes(router.pathname);

    useEffect(() => {
      if (
        isPasswordRoute &&
        !(
          authType == "email" ||
          (authType == "phone" && setting?.phone_auth_password == 1)
        )
      ) {
        router.push("/profile");
      } else {
        setIsAblseToReset(true);
      }
    }, []);

    return isAbleToReset ? <WrappedComponent {...props} /> : null;
  };
  return ResetPasswordWrapper;
};

export default CheckResetPassword;
