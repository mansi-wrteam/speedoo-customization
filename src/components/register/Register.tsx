import React, { useEffect, useState, useRef } from "react"; // Added useRef
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { t } from "@/utils/translation";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { RiCloseFill, RiCameraLine } from "react-icons/ri"; // Added RiCameraLine
import CustomFields from "../custom-fields/CustomFields";
import useCustomFields from "../custom-fields/useCustomFields";
import * as api from "@/api/apiRoutes";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { setAuthType } from "@/redux/slices/userSlice";
import { auth, getFirebaseAuthErrorMessage } from "@/utils/firebase";
import { signInWithPhoneNumber } from "firebase/auth";
import type { CountryData } from "react-phone-input-2";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";

/** Sign-up form opened from Login ("Register now"); `email` state is shared with Login. */
export interface RegisterProps {
  showRegister: boolean;
  setShowRegister: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOTP: React.Dispatch<React.SetStateAction<boolean>>;
  /** Login's email state (Firebase can set it to null or undefined). */
  email: string | null | undefined;
  setEmail: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  /** Passed by Login but not read. */
  setOtp?: React.Dispatch<React.SetStateAction<string | null>>;
  /** "email" | "number" (the login form that opened it), "" before one is chosen. */
  inputType: string;
  /** Destructured but not used. */
  setTimer: React.Dispatch<React.SetStateAction<number>>;
  setShowLogin: React.Dispatch<React.SetStateAction<boolean>>;
}

const Register = ({
  showRegister,
  setShowRegister,
  setIsOTP,
  email,
  setEmail,
  inputType,
  setTimer,
  setShowLogin,
}: RegisterProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for image input
  const fcmToken = useSelector((state: RootState) => state.User?.fcm_token);
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);

  useEffect(() => {
    const dialCode = setting?.country_code || process.env.NEXT_PUBLIC_COUNTRY_DIAL_CODE;
    setCountryCode(dialCode);
  }, []);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberWithoutCountryCode, setPhoneNumberWithoutCountryCode] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState<string | undefined>("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");
  const [isPhoneOtp, setIsPhoneOtp] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const [friendCode, setFriendCode] = useState<string | null>(null);

  // New states for Image
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    fields: customFields,
    values: customFieldValues,
    handleChange: handleCustomFieldChange,
    resetValues: resetCustomFields,
    getMissingRequired,
  } = useCustomFields({ enabled: showRegister, languageId: language?.id });

  const handleShowPassword = () => setShowPassword(!showPassword);
  const handleFriendCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => setFriendCode(e.target.value);
  const handleShowConfirmPassword = () => setShowConfirmPass(!showConfirmPass);
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value);

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        // readAsDataURL: the result is a data: URL string.
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneNumberChange = (value: string, data: CountryData) => {
    const phoneWithoutDialCode = value.startsWith(data?.dialCode)
      ? value.slice(data.dialCode.length)
      : value;
    setPhoneNumber(`+${value}`);
    setPhoneNumberWithoutCountryCode(phoneWithoutDialCode);
    // Store WITHOUT "+" so `+${countryCode}` in API calls = "+91"
    setCountryCode(data?.dialCode || "");
  };

  const handleMobileRegister = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const otpRes = await handleOtpVerification(e);
    if (!otpRes) {
      toast.error(t("invalid_otp"));
      return;
    }
    setIsLoading(true);
    e.preventDefault();
    try {
      const res = await api.registerUser({
        id: phoneNumberWithoutCountryCode as string,
        name: name,
        email: email,
        mobile: phoneNumberWithoutCountryCode,
        type: "phone",
        country_code: countryCode,
        password: password,
        fcm: fcmToken,
        phoneAuthType: true,
        profile: profileImage, // Pass image
        customFields: customFieldValues,
      });
      if (res?.status == 1) {
        toast.success(t("succesfull_register_message"));
        handleCloseRegister();
        setIsLoading(false);
      } else {
        setIsLoading(false);
        toast.error(t(res?.message as string));
        // Reset Logic...
        setShowRegister(false);
        setIsPhoneOtp(false);
        setOtp(null);
        setPassword("");
        setConfirmPassword("");
        setPhoneNumber("");
        setPhoneNumberWithoutCountryCode("");
        setName("");
        setEmail("");
        setImagePreview(null);
        setProfileImage(null);
      }
    } catch (error) {
      console.log("error", error);
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await api.registerUser({
        id: email as string,
        name: name,
        email: email,
        mobile: phoneNumberWithoutCountryCode,
        type: "email",
        country_code: countryCode,
        password: password,
        fcm: fcmToken,
        friend_code: friendCode,
        profile: profileImage, // Pass image
        customFields: customFieldValues,
      });
      if (res.status == 1) {
        setIsLoading(false);
        dispatch(setAuthType({ data: "email" }));
        setShowRegister(false);
        toast.success(t(res?.message as string));
        setIsOTP(true);
        setOtp("");
        setPassword("");
        setName("");
        setPhoneNumberWithoutCountryCode("");
        setConfirmPassword("");
        setPhoneNumber("");
        setFriendCode("");
        setImagePreview(null);
        setProfileImage(null);
      } else {
        handleResponseError(res.message as string);
      }
    } catch (error) {
      console.log("error", error);
      setIsLoading(false);
    }
  };

  // ... (keeping handleUserRegister, handleSendOTP, handleOtpVerification, handleResponseError, handleOtpChange as they were)
  const handleUserRegister = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const emailRegexPattern =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    e.preventDefault();

    try {
      if (!name) {
        setError(t("please_enter_name"));
        setErrorType("name");
        return;
      } else if (inputType == "email" && !emailRegexPattern.test(email as string)) {
        setError(t("please_enter_email"));
        setErrorType("email");
        return;
      } else if (!password) {
        setError(t("please_enter_password"));
        setErrorType("password");
        return;
      } else if (password.length < 6) {
        setError(t("password_length_msg"));
        setErrorType("password");
        return;
      } else if (!confirmPassword) {
        setError(t("please_enter_confirm_password"));
        setErrorType("confirmpassword");
        return;
      } else if (confirmPassword !== password) {
        setError(t("confirm_password_message"));
        setErrorType("confirmpassword");
        return;
      }

      const missingField = getMissingRequired();
      if (missingField) {
        setError(`${missingField} ${t("is_required")}`);
        setErrorType("customField");
        return;
      }

      {
        if (inputType == "number") {
          await handleSendOTP(e);
          setError("");
          setErrorType("");
        } else {
          await handleEmailRegister(e);
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleSendOTP = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsLoading(true);
    e.preventDefault();
    if (
      phoneNumber?.length < countryCode!.length ||
      phoneNumber?.slice(1) === countryCode
    ) {
      setError(t("please_enter_phone_number"));
      setErrorType("phone");
      setIsLoading(false);
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
          setIsLoading(false);
          setIsPhoneOtp(true);
          setShowLogin(false);
        } catch (error) {
          setError(getFirebaseAuthErrorMessage(error));
          console.log("error", error);
          setIsLoading(false);
          setIsPhoneOtp(false);
        }
      } else if (setting?.custom_sms_gateway_otp_based == 1) {
        try {
          const res = await api.sendSms({
            mobile: phoneNumberWithoutSpaces,
          });
          if (res?.status == 1) {
            // setTimer(90);
            setIsPhoneOtp(true);
            setIsLoading(false);
            setShowRegister(false);
          } else {
            setError(t("custom_send_sms_error_message"));
            setIsLoading(false);
          }
        } catch (error) {
          // Called without a value: clears the number to undefined.
          (setPhoneNumber as (value?: string) => void)();
          setError(t("custom_send_sms_error_message"));
          setIsLoading(false);
        }
      } else {
        toast.error(t("Something went wrong"));
        setIsLoading(false);
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
      setIsLoading(true);
      try {
        const user = await window.confirmationResult!.confirm(otp as string);
        setIsLoading(false);
        return true;
      } catch (error) {
        setIsLoading(false);
        return false;
      }
    } else if (setting?.custom_sms_gateway_otp_based == 1) {
      const mobileNo = phoneNumber?.split(" ")?.[1];
      try {
        const response = await api.verifyOTP({
          mobile: phoneNumberWithoutCountryCode as string,
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

  const handleResponseError = (errorMessage: string) => {
    toast.error(t(errorMessage));
    setShowRegister(false);
    setIsLoading(false);
    setPassword("");
    setName("");
    setConfirmPassword("");
    setFriendCode("");
    setPhoneNumber("");
    setPhoneNumberWithoutCountryCode("");
    setImagePreview(null);
    setProfileImage(null);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cleanedInput = input.replace(/[^0-9]/g, "").slice(0, 6);
    setOtp(cleanedInput);
  };

  const handleCloseRegister = (e?: React.MouseEvent<SVGElement>) => {
    setName("");
    setEmail("");
    setPhoneNumber("");
    setOtp(null);
    setIsPhoneOtp(false);
    setPassword("");
    setConfirmPassword("");
    setFriendCode("");
    setShowRegister(false);
    setIsLoading(false);
    setImagePreview(null);
    setProfileImage(null);
    resetCustomFields();
  };

  return (
    <Dialog open={showRegister}>
      <DialogContent className="overflow-y-auto max-h-[90%] bg-[var(--surface-default)]">
        <DialogHeader className="flex justify-between flex-row items-center">
          <div className="">
            <h1 className="text-3xl font-bold text-[var(--foreground-primary)]">{t("register")}</h1>
          </div>
          <div className="bg-[var(--surface-subtle)] rounded-full p-[8px] gap-[4px] cursor-pointer">
            <RiCloseFill
              size={22}
              className="text-[var(--button-link-foreground-default)]"
              onClick={handleCloseRegister}
            />
          </div>
        </DialogHeader>
        <div>
          <div className="flex flex-col">
            <h5 className="text-[34px] font-bold text-[var(--foreground-primary)]">{t("welcome")}</h5>
            <span className="text-[var(--foreground-tertiary)] text-xs">{t("signupMessage")}</span>
          </div>

          {/* Profile Image Preview & Input (only show on registration step, not OTP step) */}
          {!isPhoneOtp && (
            <div className="flex flex-col items-center mt-6">
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden border border-[var(--border-default)] cursor-pointer flex items-center justify-center bg-[var(--surface-subtle)] group"
                onClick={() => fileInputRef.current!.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <RiCameraLine size={30} className="text-[var(--foreground-placeholder)]" />
                )}
                <div className="absolute bottom-0 w-full bg-black/40 py-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-[var(--foreground-inverse)] font-medium">{t("edit")}</span>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
            </div>
          )}

          {isPhoneOtp ? (
            <div className="flex flex-col gap-1 mt-8">
              <span className="font-bold text-base text-[var(--form-default-label)]">
                {t("otp")}
                <span className="text-[var(--form-default-required)]">*</span>
              </span>
              <div className="">
                <input
                  type="text"
                  className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm w-full"
                  placeholder={t("otpPlaceholder")}
                  value={otp as string}
                  onChange={handleOtpChange}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-base text-[var(--form-default-label)]">
                  {t("name")}
                  <span className="text-[var(--form-default-required)]">*</span>
                </span>
                <input
                  type="text"
                  className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm"
                  placeholder={t("please_enter_name")}
                  value={name}
                  onChange={handleUsernameChange}
                />
                {error && errorType == "name" && (
                  <span className="text-xs text-[var(--status-error-default)]">{error}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-base text-[var(--form-default-label)]">
                  {t("email")}
                  {inputType == "email" && <span className="text-[var(--form-default-required)]">*</span>}
                </span>
                <input
                  type="text"
                  className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm"
                  placeholder={t("please_enter_email")}
                  value={email as string}
                  onChange={handleEmailChange}
                />
                {error && errorType == "email" && (
                  <span className="text-xs text-[var(--status-error-default)]">{error}</span>
                )}
              </div>
              <div className="flex flex-col gap-1 pl-0">
                <span className="font-bold text-base text-[var(--form-default-label)]">
                  {t("mobileNumber")}
                  {inputType == "number" && <span className="text-[var(--form-default-required)]">*</span>}
                </span>
                <PhoneInput
                  inputStyle={{ direction: language?.type as React.CSSProperties["direction"] }}
                  country={setting?.nation_code?.toLowerCase() || process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE}
                  value={phoneNumber}
                  onChange={(phone, data) => handlePhoneNumberChange(phone, data as CountryData)}
                  className="w-full "
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-base text-[var(--form-default-label)]">
                  {t("password")}
                  <span className="text-[var(--form-default-required)]">*</span>
                </span>
                <div className="relative w-full ">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm w-full"
                    placeholder={t("please_enter_password")}
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <span className="absolute right-3 top-3 cursor-pointer text-[var(--foreground-tertiary)]" onClick={handleShowPassword}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {error && errorType == "password" && (
                  <span className="text-xs text-[var(--status-error-default)]">{error}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-base text-[var(--form-default-label)]">
                  {t("confirmPassword")}
                  <span className="text-[var(--form-default-required)]">*</span>
                </span>
                <div className="relative w-full ">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm w-full"
                    placeholder={t("please_enter_confirm_password")}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                  />
                  <span className="absolute right-3 top-3 cursor-pointer text-[var(--foreground-tertiary)]" onClick={handleShowConfirmPassword}>
                    {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {error && errorType == "confirmpassword" && (
                  <span className="text-xs text-[var(--status-error-default)]">{error}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-base text-[var(--form-default-label)]">{t("friend_code")}</span>
                <input
                  type="text"
                  className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm disabled:text-[var(--foreground-disabled)]"
                  placeholder={t("friend_code")}
                  value={friendCode as string}
                  onChange={handleFriendCodeChange}
                />
              </div>
              <CustomFields
                fields={customFields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                languageId={language?.id}
              />
            </div>
          )}

          <div className="mt-4 flex flex-col justify-center text-center gap-3">
            <button
              onClick={isPhoneOtp ? handleMobileRegister : handleUserRegister}
              className="bg-[var(--button-secondary-background-default)] hover:bg-[var(--button-secondary-background-hover)] disabled:bg-[var(--button-secondary-background-disabled)] py-2 px-4 text-[var(--button-secondary-foreground-default)] disabled:text-[var(--button-secondary-foreground-disabled)] text-center rounded-sm text-xl font-normal transition-colors"
              disabled={isLoading}
            >
              {isLoading ? t("loading") : isPhoneOtp ? t("register") : t("verify")}
            </button>
            {error && errorType == "customField" && (
              <span className="text-xs text-[var(--status-error-default)]">
                {error}
              </span>
            )}
            <span className="text-base font-medium text-[var(--foreground-primary)]">
              {t("alreadyHaveAnAccount")}{" "}
              <span
                className="text-[var(--brand-foreground-default)] hover:text-[var(--brand-foreground-hover)] font-semibold underline ml-[2px] cursor-pointer"
                onClick={() => setShowRegister(false)}
              >
                {t("signIn")}
              </span>
            </span>
          </div>

          <div className="py-6 flex items-center justify-center">
            <p className=" text-center text-sm text-[var(--foreground-primary)]">
              {t("agreement_updated_message")}{" "}
              {setting?.web_settings?.site_title} {t("terms_of_service")}{" "}
              {t("and")} {t("privacy_policy")}
            </p>
          </div>
        </div>
        <div id="recaptcha-container" style={{ display: "none" }}></div>
      </DialogContent>
    </Dialog>
  );
};

export default Register;