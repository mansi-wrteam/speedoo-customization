"use client";
import react, { useEffect, useRef, useState } from "react";
import type { CSSProperties, Dispatch, FormEvent, SetStateAction, SyntheticEvent } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import Image from "next/image";
import { t } from "@/utils/translation";
import { DEMO_MOBILE, DEMO_OTP, isDemoModeOn } from "@/utils/demoMode";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import GoogleLogo from "@/assets/googleLogin.svg";
import OtpInput from "react-otp-input";
import { useDispatch, useSelector } from "react-redux";
import {
  setCart,
  setCartProducts,
  setCartSubTotal,
  setDoorStepDeliveryMode,
  setIsGuest,
  setSelfPickupMode,
} from "@/redux/slices/cartSlice";
import {
  setAuthId,
  setAuthType,
  setCurrentUser,
} from "@/redux/slices/userSlice";
import { FaRegEye, FaRegEyeSlash, FaRegEnvelope } from "react-icons/fa";
import { FiPhone } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
} from "firebase/auth";
import { app, auth, getFirebaseAuthErrorMessage } from "@/utils/firebase";
import * as api from "@/api/apiRoutes";
import { setTokenThunk } from "@/redux/thunk/loginthunk";
import NewUserModal from "../newusermodal/NewUserModal";
import { RiCloseFill } from "react-icons/ri";
import Register from "../register/Register";
import { setSetting } from "@/redux/slices/settingSlice";
import ForgetPasswordModal from "../forgetpasswordmodal/ForgetPasswordModal";
import { LocalizedLink } from "@/utils/localizedNav";
import type { CountryData } from "react-phone-input-2";
import type { User as FirebaseUser } from "firebase/auth";
import type { AppDispatch } from "@/redux/hooks";
import type { Nullable, Numeric } from "@/types/common";
import type { CartData, CartLine } from "@/types/models";
import type { RootState } from "@/types/state";

/** Rendered by Header, CartDrawer and AddonCustomizationModal. */
export interface LoginProps {
  showLogin: boolean;
  setShowLogin: Dispatch<SetStateAction<boolean>>;
  /** Unused: Header now derives the bottom-nav tab from the route when Login closes. */
  setMobileActiveKey?: Dispatch<SetStateAction<number>>;
}

export function Login({ showLogin, setShowLogin }: LoginProps) {
  const city = useSelector((state: RootState) => state.City.city);
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const fcmToken = useSelector((state: RootState) => state.User?.fcm_token);
  const dispatch = useDispatch<AppDispatch>();
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultCountry = setting?.nation_code?.toLowerCase() || process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE;

  // Firebase providerData can set userName / email / phoneNumber to null or undefined.
  const [userName, setUserName] = useState<string | null | undefined>("");
  const [showNewUser, setShowNewUser] = useState(false);
  const [isOTP, setIsOTP] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null | undefined>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null | undefined>("");
  const [countryCode, setCountryCode] = useState<string | null | undefined>(null);
  const [inputValue, setInputValue] = useState<string | null>(null);
  const [inputType, setInputType] = useState("");
  const [password, setPassword] = useState("");
  // Starts as "" and is then toggled to a boolean.
  const [showPassword, setShowPassword] = useState<string | boolean>("");
  const [phoneNumberWithoutCountryCode, setPhoneNumberWithoutCountryCode] =
    useState("");
  const [Uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(90);
  const [otpDisabled, setOtpDisabled] = useState(true);
  const [error, setError] = useState("");
  const [userAuthType, setUserAuthType] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showForgetPassword, setShowForgetPassword] = useState(false);
  const [phonePassword, setPhonePassword] = useState("");
  const [forgotPasswordType, setForgotPasswordType] = useState("");
  // false, or the translated "forget_password_note".
  const [isErrorMessage, setIsErrorMessage] = useState<boolean | string>(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputType]);

  useEffect(() => {
    const dialCode = setting?.country_code || process.env.NEXT_PUBLIC_COUNTRY_DIAL_CODE;
    setCountryCode(dialCode);
  }, []);

  useEffect(() => {
    if (showLogin === true && showRegister === false) {
      // The switch now comes from the admin panel too (§10); the number and
      // OTP stay client-side, because the backend never sends them.
      if (isDemoModeOn(setting)) {
        setInputType("number");
        dispatch(setAuthType({ data: "number" }));
        const dialCode = setting?.country_code || process.env.NEXT_PUBLIC_COUNTRY_DIAL_CODE;
        setCountryCode(dialCode);
        setPhoneNumber(`+${String(dialCode ?? "").replace("+", "")}${DEMO_MOBILE}`);
        setPhoneNumberWithoutCountryCode(DEMO_MOBILE);
        if (inputType != "email") {
          setOtp(DEMO_OTP);
        }
      }
    }
    if (setting?.phone_login == 1) {
      setInputType("number");
    } else if (setting?.email_login == 1) {
      setInputType("email");
    }
  }, [showLogin]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setOtpDisabled(false);
    }

    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    if (showLogin) {
      generateRecaptcha();
    }
    return () => {
      recaptchaClear();
    };
  }, [showLogin]);

  const recaptchaClear = async () => {
    const recaptchaContainer = document.getElementById("recaptcha-container");
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      } catch (error) {
        console.error("Error clearing ReCAPTCHA verifier:", error);
      }
    }
    if (recaptchaContainer) {
      recaptchaContainer.innerHTML = "";
      console.log("ReCAPTCHA container cleared");
    }
  };

  const generateRecaptcha = async () => {
    await recaptchaClear();
    const recaptchaContainer = document.getElementById("recaptcha-container");
    if (!recaptchaContainer) {
      console.error("Container element 'recaptcha-container' not found.");
      return null;
    }
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        recaptchaContainer,
        {
          size: "invisible",
        },
      );
      return window.recaptchaVerifier;
    } catch (error) {
      console.error("Error initializing RecaptchaVerifier:", (error as Error).message);
      return null;
    }
  };

  const handleShowRegister = (type: string) => {
    setShowRegister(true);
    setInputType(type);

    setError("");
  };

  const handleEmailChange = (value: string, data: object) => {
    setInputType("email");
    setEmail(value);
    setOtp("");
    setPhoneNumber("");
    setCountryCode("");
  };

  const handlePhoneNoChange = (value: string, data: Partial<CountryData>) => {
    setInputValue(value);
    setInputType("number");
    dispatch(setAuthType({ data: "phone" }));
    const dialCode = data?.dialCode || "";
    const phoneWithoutDialCode = value.startsWith(dialCode)
      ? value.slice(dialCode.length)
      : value;
    setPhoneNumber(`+${value}`);
    setPhoneNumberWithoutCountryCode(phoneWithoutDialCode);
    setCountryCode(dialCode);
    setOtp("");
  };
  const handleSendOTP = async (e: SyntheticEvent) => {
    setLoading(true);
    setOtpDisabled(true);
    e.preventDefault();
    if (
      (phoneNumber?.length as number) < countryCode!.length ||
      phoneNumber?.slice(1) === countryCode
    ) {
      setError(t("please_enter_phone_number"));
      setLoading(false);
    } else {
      const phoneNumberWithoutSpaces = `${phoneNumber}`.replace(/\s+/g, "");
      if (setting?.firebase_authentication == 1) {
        try {
          const confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumberWithoutSpaces,
            window.recaptchaVerifier,
          );
          window.confirmationResult = confirmationResult;
          setTimer(90);
          setIsOTP(true);
          setLoading(false);
        } catch (error) {
          console.log("error", error);
          // Called without a value: clears the number to undefined.
          (setPhoneNumber as (value?: string) => void)();
          setError(getFirebaseAuthErrorMessage(error));
          setLoading(false);
          setIsOTP(false);
        }
      } else if (setting?.custom_sms_gateway_otp_based == 1) {
        try {
          const res = await api.sendSms({
            mobile: phoneNumberWithoutSpaces,
          });
          if (res?.status == 1) {
            setTimer(90);
            setIsOTP(true);
            setLoading(false);
          } else {
            setError(t("custom_send_sms_error_message"));
            setLoading(false);
          }
        } catch (error) {
          (setPhoneNumber as (value?: string) => void)();
          setError(t("custom_send_sms_error_message"));
          setLoading(false);
        }
      } else {
        toast.error(t("Something went wrong"));
        setLoading(false);
      }
    }
  };

  const handleOtpVerification = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (otp == "") {
      toast.error(t("otp_required"));
      return;
    }
    if (setting?.firebase_authentication == 1) {
      setLoading(true);
      try {
        const user = await window.confirmationResult!.confirm(otp as string);
        dispatch(setAuthId({ data: user.user.uid }));
        setUid(user.user.uid);
        const loginResponse = await loginApiCall(
          user.user,
          phoneNumberWithoutCountryCode,
          fcmToken,
          "phone",
          `+${countryCode}`,
        );
        setLoading(false);
      } catch (error) {
        setLoading(false);
        toast.error(t("invalid_otp"));
      }
    } else if (setting?.custom_sms_gateway_otp_based == 1) {
      const mobileNo = phoneNumber?.split(" ")?.[1];
      try {
        const response = await api.verifyOTP({
          mobile: phoneNumberWithoutCountryCode,
          country_code: `+${countryCode}`,
          otp: otp as string,
        });
        if (
          response?.status == 1 &&
          response?.message == "otp_valid_but_user_invalid"
        ) {
          setShowNewUser(true);
          setShowLogin(false);
          setIsOTP(false);
          dispatch(setAuthType({ data: "phone" }));
          setPhoneNumber(mobileNo);
          setUserName("");
          setEmail("");
        } else if (response?.status == 1) {
          const tokenSet = await dispatch(
            setTokenThunk(response?.data?.access_token),
          );
          await getCurrentUser();
          dispatch(setAuthType({ data: "phone" }));
          if (response?.data?.user?.status == 1) {
            dispatch(setIsGuest({ data: false }));
          }
          await handleFetchSetting();
          // The guest cart is merged by CartDrawer (WEB_PARITY_V4.0.2 §1.8):
          // it is always mounted, it reacts to signing in, and it owns the
          // "different seller" question that this copy could not ask.
          await fetchCart();
          setError("");
          setOtp("");
          setPhoneNumber("");
          setLoading(false);
          setIsOTP(false);
          setShowLogin(false);
        } else {
          toast.error(t("invalid_otp"));
        }
      } catch (error) {
        console.log("error", error);
      }
    }
  };

  const handleFetchSetting = async () => {
    try {
      const res = await api.getSetting();
      const parsedSetting = JSON.parse(atob(res.data));
      dispatch(setSetting({ data: parsedSetting }));
    } catch (error) {
      console.log("error", error);
    }
  };

  const getProductData = (cartData: CartData) => {
    const cartProducts = cartData?.cart?.map((product) => {
      return {
        product_id: product?.product_id,
        product_variant_id: product?.product_variant_id,
        qty: product?.qty,
      };
    });
    return cartProducts;
  };

  const fetchCart = async () => {
    const latitude = city?.latitude || setting?.default_city?.latitude;
    const longitude = city?.longitude || setting?.default_city?.longitude;
    try {
      const response = await api.getCart({
        latitude: latitude,
        longitude: longitude,
      });
      if (response.status === 1) {
        dispatch(setCart({ data: response.data }));
        dispatch(setSelfPickupMode({ data: response?.data?.self_pickup_mode as Numeric | undefined }));
        dispatch(
          setDoorStepDeliveryMode({
            data: response?.data?.doorstep_delivery_mode as Numeric | undefined,
          }),
        );
        const productsData = getProductData(response.data);
        // Undefined only if a status-1 response has no `cart` (stored as-is).
        dispatch(setCartProducts({ data: productsData as CartLine[] }));
        dispatch(setCartSubTotal({ data: response?.data?.sub_total }));
      } else {
        dispatch(setCart({ data: null }));
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const loginApiCall = async (
    user: FirebaseUser | null,
    /** Phone number without dial code, or the Google account email. */
    id: string | null,
    fcm: Nullable<string>,
    /** "phone" | "google". */
    type: string,
    /** "+<dial code>", or null for Google. */
    country_code: string | null,
  ) => {
    setLoading(true);
    try {
      // The Firebase user passed in (phone OTP / Google); `Uid` state is still
      // stale inside this call, so it is only the fallback.
      dispatch(setAuthId({ data: user?.uid ?? Uid }));
      const isPhoneAuthPassword =
        setting?.phone_auth_password == 1 ? true : false;
      const res = await api.login({
        id: id as string,
        fcm,
        type,
        phoneAuthType: isPhoneAuthPassword,
        password: phonePassword,
        country_code: country_code as string,
      });
      if (res.status === 1) {
        if (res?.status == 1 && res?.message == "user_deactivated") {
          toast.error(t("user_deactivated"));
          setLoading(false);
          setShowLogin(false);
          return;
        } else {
          const tokenSet = await dispatch(
            setTokenThunk(res?.data?.access_token),
          );
          await getCurrentUser();
          dispatch(setAuthType({ data: type }));
          if (res?.data?.user?.status == 1) {
            dispatch(setIsGuest({ data: false }));
          }
          await handleFetchSetting();
          // The guest cart is merged by CartDrawer (WEB_PARITY_V4.0.2 §1.8).
          await fetchCart();
          setError("");
          setOtp("");
          setPhoneNumber("");
          setLoading(false);
          setIsOTP(false);
          setShowLogin(false);
          setShowRegister(false);
        }
      } else if (res.message == "user_exist_with_email") {
        toast.error(t("user_exist_with_email"));
        setLoading(false);
      } else if (res.message == "user_exist_password_blank") {
        setIsErrorMessage(t("forget_password_note"));
        handleShowForgotPassword("phone");
        setLoading(false);
      } else if (res.message == "invalid_password") {
        setError(t("password_not_valid"));
        setPhonePassword("");
        setLoading(false);
      } else if (
        res.message == "user_not_exist" &&
        isPhoneAuthPassword == true
      ) {
        setError(t("user_not_exist"));
        setLoading(false);
      } else if (res?.message == "user_exist_with_google") {
        setError(t("user_exist_with_google"));
        setLoading(false);
      } else {
        setUserAuthType(type);
        setEmail(user?.providerData?.[0]?.email);
        setUserName(user?.providerData?.[0]?.displayName);
        setPhoneNumber(user?.providerData?.[0]?.phoneNumber);
        setShowNewUser(true);
        setShowLogin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("error", error);
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const response = await api.getUser();
      dispatch(setCurrentUser({ data: response.user }));
      toast.success(t('login_success'));
    } catch (error) {
      console.log("error", error);
    }
  };

  const handlePasswordShow = () => {
    setShowPassword(!showPassword);
  };

  const handleShowForgotPassword = (type: string) => {
    setPhonePassword("");
    // setShowLogin(false);
    setForgotPasswordType(type);
    setShowForgetPassword(true);
  };

  const handleHideLogin = async () => {
    await recaptchaClear();
    setIsOTP(false);
    setShowLogin(false);
    setError("");
    setInputValue("");
    setInputType("");
    setLoading(false);
    setEmail("");
    setPassword("");
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const credentials = GoogleAuthProvider.credentialFromResult(result);
      const user = result?.user;
      dispatch(setAuthType({ data: "google" }));
      const response = await loginApiCall(
        user,
        user?.providerData[0].email,
        fcmToken,
        "google",
        null
      );
    } catch (error) {
      if ((error as Error)?.message?.includes("auth/popup-closed-by-user")) {
        toast.error(t("popup_closed_by_user"));
      }
    }
  };

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    setLoading(true);

    if (e != undefined) {
      e.preventDefault();
    }
    if (!email || !password) {
      setError(t("email_password_mandatory"));
      setLoading(false);
      return;
    }
    try {
      const res = await api.login({
        id: email,
        type: "email",
        password: password,
        fcm: fcmToken,
      });
      if (res.status === 1) {
        if (res?.status == 1 && res?.message == "user_deactivated") {
          toast.error(t("user_deactivated"));
          setLoading(false);
          setShowLogin(false);
          return;
        } else {
          const tokenSet = await dispatch(
            setTokenThunk(res?.data?.access_token),
          );
          await getCurrentUser();
          dispatch(setAuthType({ data: "email" }));
          if (res?.data?.user?.status == 1) {
            dispatch(setIsGuest({ data: false }));
          }
          await handleFetchSetting();
          // The guest cart is merged by CartDrawer (WEB_PARITY_V4.0.2 §1.8).
          await fetchCart();
          setError("");
          setOtp("");
          setPhoneNumber("");
          setLoading(false);
          setIsOTP(false);
          setShowRegister(false);
          setShowLogin(false);
        }
      } else {
        setLoading(false);
        if (res.message == "email_not_verified") {
          setIsOTP(true);
          toast.error(t("email_not_verified"));
          setOtp("");
        } else if (res.message == "user_does_not_exist") {
          setError(t("user_does_not_exist"));
          // setInputValue("")
          setPassword("");
        } else if (res.message == "user_exist_with_email") {
          toast.error(t("user_exist_with_email"));
        } else if (res.message == "user_exist_with_google") {
          toast.error(t("user_exist_with_google"));
          setError(t("user_exist_with_google"));
          setPassword("");
        } else {
          setError(t("password_not_valid"));
          // setInputValue("")
          setPassword("");
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleEmailVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await api.verifyEmail({ email: email as string, code: otp as string });
      if (res.status == 1) {
        const tokenSet = await dispatch(setTokenThunk(res?.data?.access_token));
        await getCurrentUser();
        dispatch(setAuthType({ data: "email" }));
        if (res?.data?.user?.status == 1) {
          dispatch(setIsGuest({ data: false }));
        }
        await handleFetchSetting();
        // The guest cart is merged by CartDrawer (WEB_PARITY_V4.0.2 §1.8).
        await fetchCart();
        // props.setShow(false)
        setIsOTP(false);
        setShowLogin(false);
      } else {
        setError(res.message as string);
        toast.error(res.message);
      }
    } catch (error) {
      console.log("error", error);
    }
  };


  const handlePhoneLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (setting?.phone_auth_password == 1) {
      if (
        (phoneNumber?.length as number) < countryCode!.length ||
        phoneNumber?.slice(1) === countryCode
      ) {
        setError(t("please_enter_phone_number"));
        setLoading(false);
        return;
      } else if (!phonePassword) {
        setError(t("please_enter_password"));
        return;
      } else {
        loginApiCall(
          null,
          phoneNumberWithoutCountryCode,
          fcmToken,
          "phone",
          `+${countryCode}`,
        );
      }
    } else {
      handleSendOTP(e);
    }
  };

  const renderPhoneInput = () => (
    <>
      {error ? (
        <p className="text-center text-xs text-[var(--status-error-default)] my-2 font-semibold">
          {error}
        </p>
      ) : (
        <></>
      )}
      <form onSubmit={handlePhoneLogin}>
        <div className="flex flex-col gap-4">
          <PhoneInput
            inputStyle={{ direction: language?.type as CSSProperties["direction"] }}
            country={defaultCountry}
            value={phoneNumber}
            onChange={(phone, data) => handlePhoneNoChange(phone, data)}
            inputProps={{
              name: "phone",
              required: true,
              autoFocus: true,
            }}
          />
          {setting?.phone_auth_password == 1 && (
            <form className="flex flex-col relative">
              <input
                type={showPassword ? "text" : "password"}
                value={phonePassword}
                onChange={(e) => setPhonePassword(e.target.value)}
                className="bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border-[var(--form-default-border)] border-[1px] py-2 px-4 rounded-sm w-full "
                placeholder={t("passwordMessage")}
              />
              <div
                className="absolute right-[10px] top-[12px] text-[var(--foreground-tertiary)]"
                onClick={handlePasswordShow}
              >
                {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
              </div>
              <div className="text-base font-medium leading-6 mt-2 text-right">
                <p
                  className="cursor-pointer text-[var(--brand-foreground-default)]"
                  onClick={(e) => handleShowForgotPassword("phone")}
                >
                  {t("forget_password_?")}
                </p>
              </div>
            </form>
          )}
        </div>
        <button
          disabled={loading}
          type="submit"
          className="bg-[var(--button-secondary-background-default)] hover:bg-[var(--button-secondary-background-hover)] disabled:bg-[var(--button-secondary-background-disabled)] w-full px-4 py-2 text-[var(--button-secondary-foreground-default)] disabled:text-[var(--button-secondary-foreground-disabled)] rounded-sm text-xl font-normal mt-4 transition-colors"
        >
          {loading ? t("loading") : t("continue")}
        </button>
        {setting?.phone_auth_password == 1 && (
          <h2 className="mt-1 block md:flex justify-start md:justify-center gap-0 md:gap-1 text-base font-medium text-center text-[var(--foreground-primary)]">
            {t("registerMsg")}
            <p
              onClick={() => handleShowRegister("number")}
              className="text-[var(--brand-foreground-default)] hover:text-[var(--brand-foreground-hover)] text-base font-medium underline ml-[2px] cursor-pointer"
            >
              {t("registerNow")}
            </p>
          </h2>
        )}
      </form>
    </>
  );

  const renderEmailInput = () => (
    <>
      {error ? (
        <p className="text-center text-xs text-[var(--status-error-default)] my-2 font-semibold">
          {error}
        </p>
      ) : (
        <></>
      )}

      <form className="relative" onSubmit={handleEmailLogin}>
        <input
          value={email as string}
          onChange={(e) => handleEmailChange(e.target.value, {})}
          className="bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border-[var(--form-default-border)] border-[1px] py-2 px-4 rounded-sm w-full "
          placeholder={t("email_placeholder")}
          ref={inputRef}
        />
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border-[var(--form-default-border)] border-[1px] py-2 px-4 rounded-sm w-full mt-4"
          placeholder={t("passwordMessage")}
        />
        <div
          className="absolute right-[10px] top-[72px] text-[var(--foreground-tertiary)]"
          onClick={handlePasswordShow}
        >
          {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
        </div>
        <div className="text-base font-medium leading-6 mt-2 text-right">
          <p
            className="cursor-pointer text-[var(--brand-foreground-default)]"
            onClick={(e) => handleShowForgotPassword("email")}
          >
            {t("forget_password_?")}
          </p>
        </div>
        <button
          disabled={loading}
          type="submit"
          className="bg-[var(--button-secondary-background-default)] hover:bg-[var(--button-secondary-background-hover)] disabled:bg-[var(--button-secondary-background-disabled)] w-full px-4 py-2 text-[var(--button-secondary-foreground-default)] disabled:text-[var(--button-secondary-foreground-disabled)] rounded-sm text-xl font-normal mt-4 transition-colors"
        >
          {loading ? t("loading") : t("continue")}
        </button>
        <h2 className="mt-1 block md:flex justify-start md:justify-center gap-0 md:gap-1 text-base font-medium text-center">
          {t("registerMsg")}
          <p
            onClick={() => handleShowRegister("email")}
            className="text-[var(--brand-foreground-default)] hover:text-[var(--brand-foreground-hover)] text-base font-medium underline ml-[2px] cursor-pointer"
          >
            {t("registerNow")}
          </p>
        </h2>
      </form>
    </>
  );

  return (
    <>
      <Dialog open={showLogin}>
        <DialogContent className="overflow-y-auto overflow-x-hidden bg-[var(--surface-default)]">
          <DialogHeader className="flex justify-between items-center flex-row">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground-primary)]">{t("login")}</h1>
            </div>
            {/* <div className="relative aspect-square object-cover h-[68px] w-[72px]">
              <Image
                src={setting?.web_settings?.web_logo}
                alt="logo"
                fill
                className="aspect-square w-full h-full object-cover"
              />
            </div> */}
            <div className="bg-[var(--surface-subtle)] rounded-full p-[8px] gap-[4px] cursor-pointer">
              <RiCloseFill
                size={22}
                className="text-[var(--button-link-foreground-default)]"
                onClick={() => handleHideLogin()}
              />
            </div>
          </DialogHeader>
          <div className="">
            <div className="my-6">
              {isOTP ? (
                <>
                  <div className="flex flex-col ">
                    <h5 className="text-[22px] text-wrap font-bold text-[var(--foreground-primary)]">
                      {t("enter_verification_code")}
                    </h5>
                    <span className="flex flex-col text-start item-start text-[var(--foreground-tertiary)]">
                      {t("otp_send_message")}
                      <p className="font-medium py-2 text-[var(--foreground-primary)]">
                        {inputType == "email" ? (
                          <div className="flex gap-2">
                            {t("email")}: {email}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {t("phone")}: {phoneNumber}
                          </div>
                        )}
                      </p>
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col ">
                  <h5 className="text-[40px] font-bold text-[var(--foreground-primary)]">
                    {t("welcome")}
                  </h5>
                  {(setting?.email_login == 1 || setting?.phone_login == 1) && (
                    <span className="text-[var(--foreground-tertiary)] text-xs">
                      {t("login_message")}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div>
              {isOTP ? (
                <form
                  onSubmit={
                    inputType == "email"
                      ? handleEmailVerify
                      : handleOtpVerification
                  }
                >
                  <div className="overflow-auto p-0 flex items-center justify-center flex-col ">
                    {error ? (
                      <p className="text-center text-xs text-[var(--status-error-default)]">
                        {error}
                      </p>
                    ) : (
                      <></>
                    )}
                    <OtpInput
                      value={otp as string}
                      onChange={setOtp}
                      numInputs={6}
                      inputType="number"
                      renderInput={(props) => (
                        <input
                          {...props}
                          className={`border mx-1 md:mx-2 rounded-sm text-center outline-none
                                      p-2 w-10 md:w-[62px] mt-6 transition-shadow ${
                                        props.value
                                          ? "border-[var(--form-focus-filled-border)] bg-[var(--form-focus-filled-background)] text-[var(--form-focus-filled-text)] shadow-[0_0_0_3px_var(--form-focus-filled-ring)]"
                                          : "border-[var(--form-default-border)] bg-[var(--form-default-background)] text-[var(--form-default-text)]"
                                      } focus:border-[var(--form-focus-filled-border)] focus:shadow-[0_0_0_3px_var(--form-focus-filled-ring)]`}
                          style={{
                            fontSize: "16px",
                          }}
                        />
                      )}
                    />
                  </div>
                  <div className="mt-8 flex justify-center ">
                    <button
                      className="w-full bg-[var(--button-secondary-background-default)] hover:bg-[var(--button-secondary-background-hover)] text-[var(--button-secondary-foreground-default)] text-xl py-2 rounded-sm transition-colors"
                      type="submit"
                    >
                      {loading == true ? t("loading") : t("login")}
                    </button>
                  </div>
                  {inputType == "number" && (
                    <div className="mt-2 text-center">
                      <div className="text-base font-medium flex gap-1 justify-center my-2 text-[var(--foreground-primary)]">
                        <button onClick={handleSendOTP} disabled={otpDisabled}>
                          {timer === 0 ? (
                            `Resend OTP`
                          ) : (
                            <>
                              {t("resetOtpIn")}{" "}
                              <strong> {formatTime(timer)} </strong>{" "}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <>
                  <div className="my-4 flex flex-col gap-2 ">
                    {setting?.email_login == 1 && setting?.phone_login == 1 ? (
                      inputType == "number" ? (
                        renderPhoneInput()
                      ) : (
                        renderEmailInput()
                      )
                    ) : setting?.phone_login == 1 ? (
                      renderPhoneInput()
                    ) : setting?.email_login == 1 ? (
                      renderEmailInput()
                    ) : (
                      <></>
                    )}
                  </div>

                  {setting?.google_login == 1 &&
                    (setting?.email_login == 1 || setting?.phone_login == 1) ? (
                    <div className="flex items-center justify-between my-4 gap-2">
                      <hr className="flex-grow border-t-2 border-dashed border-[var(--border-default)]" />
                      <span className=" text-[var(--foreground-tertiary)] font-bold text-base">
                        {t("or")}
                      </span>
                      <hr className="flex-grow border-t-2 border-dashed border-[var(--border-default)]" />
                    </div>
                  ) : (
                    <></>
                  )}
                  {setting?.google_login == 1 && (
                    <>
                      <div className="my-4">
                        <button
                          onClick={handleGoogleLogin}
                          className="w-full bg-[var(--background-default)] border-[1px] border-[var(--border-default)] text-[var(--foreground-primary)] py-2  px-4 rounded-sm  gap-2 flex items-center justify-center text-base font-normal"
                        >
                          <Image
                            src={GoogleLogo}
                            alt="Google logo"
                            height={30}
                            width={30}
                            className="h-[30px] w-[30px] object-cover "
                          />{" "}
                          {t("continue_with_google")}
                        </button>
                      </div>
                    </>
                  )}
                  {setting?.email_login == 1 && inputType == "number" && (
                    <>
                      <div className="my-4">
                        <button
                          onClick={() => {
                            setError("");
                            setInputType("email");
                            setOtp(null);
                          }}
                          // onClick={handleGoogleLogin}
                          className="w-full bg-[var(--background-default)] border-[1px] border-[var(--border-default)] text-[var(--foreground-primary)] py-2  px-4 rounded-sm  gap-2 flex items-center justify-center text-base font-normal"
                        >
                          <FaRegEnvelope
                            size={30}
                            className="h-[30px] w-[30px]"
                          />{" "}
                          {t("continue_with_email")}
                        </button>
                      </div>
                    </>
                  )}
                  {setting?.phone_login == 1 && inputType == "email" && (
                    <>
                      <div className="my-4">
                        <button
                          onClick={() => {
                            setInputType("number");
                            setEmail("");
                            setPassword("");
                            setError("");
                          }}
                          className="w-full bg-[var(--background-default)] border-[1px] border-[var(--border-default)] text-[var(--foreground-primary)] py-2  px-4 rounded-sm  gap-2 flex items-center justify-center text-base font-normal"
                        >
                          <FiPhone size={30} className="h-[30px] w-[30px]" />{" "}
                          {t("continue_with_phone")}
                        </button>
                      </div>
                    </>
                  )}
                  <div className="py-6 flex items-center justify-center">
                    <p className="text-center text-[var(--foreground-primary)]">
                      {t("agreement_updated_message")}{" "}
                      {setting?.web_settings?.site_title}{" "}
                      <LocalizedLink
                        href="/terms-and-conditions"
                        className="text-[var(--brand-foreground-default)] hover:text-[var(--brand-foreground-hover)] underline font-semibold"
                      >
                        {t("terms_of_service")}
                      </LocalizedLink>{" "}
                      {t("and")}{" "}
                      <LocalizedLink
                        href="/privacy-policy"
                        className="text-[var(--brand-foreground-default)] hover:text-[var(--brand-foreground-hover)] underline font-semibold"
                      >
                        {t("privacy_policy")}
                      </LocalizedLink>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          <div id="recaptcha-container" style={{ display: "none" }}></div>
        </DialogContent>
      </Dialog>
      <NewUserModal
        showNewUser={showNewUser}
        setShowNewUser={setShowNewUser}
        setPhoneNumberWithoutCountryCode={setPhoneNumberWithoutCountryCode}
        setCountryCode={setCountryCode}
        setEmail={setEmail}
        setUserName={setUserName}
        userName={userName}
        email={email}
        phoneNumberWithoutCountryCode={phoneNumberWithoutCountryCode}
        countryCode={countryCode}
        setIsOTP={setIsOTP}
      />
      <Register
        setShowRegister={setShowRegister}
        showRegister={showRegister}
        setIsOTP={setIsOTP}
        email={email}
        setEmail={setEmail}
        setOtp={setOtp}
        inputType={inputType}
        setTimer={setTimer}
        setShowLogin={setShowLogin}
      />
      <ForgetPasswordModal
        showForgetPassword={showForgetPassword}
        setShowForgetPassword={setShowForgetPassword}
        forgotPasswordType={forgotPasswordType}
        isErrorMessage={isErrorMessage}
      />
    </>
  );
}

export default Login;
