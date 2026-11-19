import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { t } from "@/utils/translation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import * as api from "@/api/apiRoutes";
import { toast, ToastContainer } from "react-toastify";
import PhoneInput from "react-phone-input-2";
import { useSelector } from "react-redux";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth, getFirebaseAuthErrorMessage } from "@/utils/firebase";
import type { CountryData } from "react-phone-input-2";
import type { RootState } from "@/types/state";

export interface ForgetPasswordModalProps {
  showForgetPassword: boolean;
  setShowForgetPassword: React.Dispatch<React.SetStateAction<boolean>>;
  /** "email" | "phone". */
  forgotPasswordType: string;
  /** false, or the translated "forget_password_note" (only its truthiness is read). */
  isErrorMessage: boolean | string;
}

const ForgetPasswordModal = ({
  showForgetPassword,
  setShowForgetPassword,
  forgotPasswordType,
  isErrorMessage,
}: ForgetPasswordModalProps) => {
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const defaultCountry = setting?.nation_code?.toLowerCase() || process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE;
  const [stage, setStage] = useState(0);
  const [email, setEmail] = useState<string | null>("");
  const [otp, setOtp] = useState<string | null>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null | undefined>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [phoneNumberWithoutCountryCode, setPhoneNumberWithoutCountryCode] =
    useState("");
  const [error, setError] = useState("");

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setOtp(value);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };
  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleShowConfirmPassword = () => {
    setShowConfirmPass(!showConfirmPass);
  };

  const handleShowModal = () => {
    setStage(0);
    setLoading(false);
    setPhoneNumber(null);
    setEmail(null);
    setShowForgetPassword(false);
  };

  const handleForgetPassword = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    e.preventDefault();
    try {
      const res = await api.forgotPasswordOTP({ email: email as string });
      if (res.status == 1) {
        setStage(1);
        toast.success(t("verification_mail_sent_successfully"));
        setLoading(false);
      } else {
        if (res.message == "email_is_not_registered") {
          toast.error(t("email_is_not_registered"));
          setLoading(false);
        } else {
          setLoading(false);
          toast.error(res.message);
        }
      }
    } catch (error) {
      setLoading(false);
      console.log("error", error);
    }
  };

  const handleSendOTP = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    e.preventDefault();
    if (
      (phoneNumber?.length as number) < countryCode!.length ||
      phoneNumber?.slice(1) === countryCode
    ) {
      setError("Please enter phone number!");
      setLoading(false);
    } else {
      const phoneNumberWithoutSpaces = `${phoneNumber}`.replace(/\s+/g, "");
      if (setting?.firebase_authentication == 1) {
        try {
          const confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumberWithoutSpaces,
            window.recaptchaVerifier
          );
          window.confirmationResult = confirmationResult;
          // setTimer(90);
          setLoading(false);
          setStage(1);
        } catch (error) {
          console.log("error from send otp", error);
          // Called without a value: clears the number to undefined.
          (setPhoneNumber as (value?: string) => void)();
          setError(getFirebaseAuthErrorMessage(error));
          setLoading(false);
          // setIsOTP(false);
        }
      } else if (setting?.custom_sms_gateway_otp_based == 1) {
        try {
          const res = await api.sendSms({
            mobile: phoneNumberWithoutSpaces,
          });
          if (res?.status == 1) {
            setLoading(false);
            setStage(1);
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

  const handleOtpVerification = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (otp == "") {
      toast.error(t("otp_required"));
      return;
    }
    if (setting?.firebase_authentication == 1) {
      setLoading(true);
      try {
        const user = await window.confirmationResult!.confirm(otp as string);
        setLoading(false);
        return true;
      } catch (error) {
        setLoading(false);
        toast.error(t("invalid_otp"));
        return false;
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
          response?.message ==
            "OTP is valid, but no user found with this phone number."
        ) {
          return false;
        } else if (response?.status == 1) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.log("error", error);
      }
    }
  };

  const handleEmailResetPassword = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    e.preventDefault();
    try {
      if (password !== confirmPassword) {
        toast.error(t("confirm_password_message"));
        setLoading(false);
        return;
      }
      const res = await api.forgotPassword({
        email: email as string,
        otp: otp,
        password: password,
        confirmPassword: confirmPassword,
        type: forgotPasswordType,
      });
      if (res.status == 1) {
        setConfirmPassword("");
        setOtp("");
        setPassword("");
        setEmail("");
        setShowForgetPassword(false);
        toast.success(res.message);
        setStage(0);
        setLoading(false);
      } else {
        setLoading(false);
        setStage(1);
        toast.error(res.message);
      }
    } catch (error) {
      setLoading(false);
      console.log("error", error);
    }
  };

  const handlePhoneNoChange = async (value: string, data: Partial<CountryData>) => {
    const dialCode = data?.dialCode || "";
    const phoneWithoutDialCode = value.startsWith(dialCode)
      ? value.slice(dialCode.length)
      : value;
    setPhoneNumber(`+${value}`);
    setPhoneNumberWithoutCountryCode(phoneWithoutDialCode);
    setCountryCode("+" + dialCode);
  };

  const verifyUser = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const res = await api.verifyUserByPhoneNum({
        mobile: phoneNumberWithoutCountryCode,
        countryCode: countryCode as string,
        type: "phone",
      });
      if (res?.message == "user_already_exist") {
        handleSendOTP(e);
      } else {
        setShowForgetPassword(false);
        setPhoneNumber("");
        toast.error(t("user_already_exist_message"));
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleMobilePasswordChange = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    e.preventDefault();
    try {
      if (password !== confirmPassword) {
        toast.error(t("confirm_password_message"));
        setLoading(false);
        return;
      }
      const otpRes = await handleOtpVerification(e);
      if (otpRes == false) {
        toast.error(t("invalid_otp"));
        setLoading(false);
        setPassword("");
        setConfirmPassword("");
        return;
      }
      const res = await api.forgotPassword({
        phone: phoneNumberWithoutCountryCode,
        otpMethod: "firebase",
        type: forgotPasswordType,
        password: password,
        confirmPassword,
        country_code: countryCode as string,
      });
      if (res.status == 1) {
        toast.success(res.message);
        setOtp(null);
        setPassword("");
        setConfirmPassword("");
        setShowForgetPassword(false);
        setStage(0);
      } else {
        toast.error(res.message);
        setOtp(null);
        setPassword("");
        setConfirmPassword("");
        setShowForgetPassword(false);
        setStage(0);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleResetPassword = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (forgotPasswordType == "email") {
      handleEmailResetPassword(e);
    } else {
      handleMobilePasswordChange(e);
    }
  };

  return (
    <Dialog open={showForgetPassword}>
      <DialogContent className="bg-[var(--surface-default)]">
        <DialogHeader className="flex justify-between items-center flex-row">
          <h1 className="font-bold text-xl text-[var(--foreground-primary)]">{t("forget_password")}</h1>
          <div className="bg-[var(--surface-subtle)] rounded-full p-[8px] cursor-pointer">
            <RiCloseFill size={22} className="text-[var(--button-link-foreground-default)]" onClick={() => handleShowModal()} />
          </div>
        </DialogHeader>
        <div>
          {stage == 0 ? (
            <div className="flex flex-col w-full gap-4">
              <div className="flex flex-col gap-1">
                {isErrorMessage && (
                  <p className="text-[var(--status-error-default)] font-semibold text-sm">
                    {t("forget_password_note")}
                  </p>
                )}
                {forgotPasswordType == "email" ? (
                  <>
                    {" "}
                    <label htmlFor="email" className="font-semibold text-[var(--form-default-label)]">
                      {t("email")}
                      <span className="text-[var(--form-default-required)]">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      className="p-2 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] rounded-sm outline-none"
                      value={email as string}
                      onChange={handleEmailChange}
                    />
                  </>
                ) : (
                  <>
                    <PhoneInput
                      inputStyle={{ direction: language?.type as React.CSSProperties["direction"] }}
                      country={defaultCountry}
                      value={phoneNumber}
                      onChange={(phone, data) =>
                        handlePhoneNoChange(phone, data)
                      }
                      inputProps={{
                        name: "phone",
                        required: true,
                        autoFocus: true,
                      }}
                    />
                  </>
                )}
              </div>
              {forgotPasswordType == "email" ? (
                <button
                  className="bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] disabled:bg-[var(--button-primary-background-disabled)] rounded-sm text-[var(--button-primary-foreground-default)] disabled:text-[var(--button-primary-foreground-disabled)] font-medium text-base py-2 transition-colors"
                  onClick={handleForgetPassword}
                  disabled={loading}
                >
                  {loading ? t("loading") : t("get_mail")}
                </button>
              ) : (
                <button
                  className="bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] disabled:bg-[var(--button-primary-background-disabled)] rounded-sm text-[var(--button-primary-foreground-default)] disabled:text-[var(--button-primary-foreground-disabled)] font-medium text-base py-2 transition-colors"
                  onClick={verifyUser}
                  disabled={loading}
                >
                  {loading ? t("loading") : t("verify_user")}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col w-full gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-base text-[var(--form-default-label)]">
                    {t("otp")}
                    <span className="text-[var(--form-default-required)]">*</span>
                  </span>
                  <div className="">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="\d*"
                      className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm w-full"
                      placeholder={t("otpPlaceholder")}
                      value={otp as string}
                      onChange={handleOtpChange}
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-base text-[var(--form-default-label)]">
                    {t("password")}
                    <span className="text-[var(--form-default-required)]">*</span>
                  </span>
                  <div className="relative w-full ">
                    <input
                      type={showPassword ? "text" : "password"}
                      name=""
                      id=""
                      className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm w-full"
                      placeholder={t("please_enter_password")}
                      value={password}
                      onChange={handlePasswordChange}
                    />
                    <span
                      className="absolute right-3 top-3 cursor-pointer text-[var(--foreground-tertiary)]"
                      onClick={handleShowPassword}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-base text-[var(--form-default-label)]">
                    {t("confirmPassword")}
                    <span className="text-[var(--form-default-required)]">*</span>
                  </span>
                  <div className="relative w-full ">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      name=""
                      id=""
                      className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm w-full"
                      placeholder={t("please_enter_confirm_password")}
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                    />
                    <span
                      className="absolute right-3 top-3 cursor-pointer text-[var(--foreground-tertiary)]"
                      onClick={handleShowConfirmPassword}
                    >
                      {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </div>
                <button
                  className="bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] disabled:bg-[var(--button-primary-background-disabled)] rounded-sm text-[var(--button-primary-foreground-default)] disabled:text-[var(--button-primary-foreground-disabled)] font-medium text-base py-2 transition-colors"
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? t("loading") : t("reset_password")}
                </button>
              </div>
            </div>
          )}
          <div id="recaptcha-container" style={{ display: "none" }}></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForgetPasswordModal;
