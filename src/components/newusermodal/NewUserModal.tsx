import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useSelector, useDispatch } from "react-redux";
import { t } from "@/utils/translation";
import { isDemoModeOn } from "@/utils/demoMode";
import * as api from "@/api/apiRoutes";
import { toast } from "react-toastify";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { RiCloseFill, RiCameraLine } from "react-icons/ri";
import CustomFields from "../custom-fields/CustomFields";
import useCustomFields from "../custom-fields/useCustomFields"; // Added camera icon
import { setAuthType, setCurrentUser } from "@/redux/slices/userSlice";
import {
  setCart,
  setCartProducts,
  setCartSubTotal,
  setDoorStepDeliveryMode,
  setIsGuest,
  setSelfPickupMode,
} from "@/redux/slices/cartSlice";
import { setSetting } from "@/redux/slices/settingSlice";
import { setTokenThunk } from "@/redux/thunk/loginthunk";
import type { CountryData } from "react-phone-input-2";
import type { AppDispatch } from "@/redux/hooks";
import type { Numeric } from "@/types/common";
import type { CartData, CartLine } from "@/types/models";
import type { RootState } from "@/types/state";

/** Completes a first sign-in (Google, or phone without an account) by registering the user. State lives in Login. */
export interface NewUserModalProps {
  showNewUser: boolean;
  setShowNewUser: React.Dispatch<React.SetStateAction<boolean>>;
  /** Firebase `displayName` can be null or undefined. */
  setUserName: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  setPhoneNumberWithoutCountryCode: React.Dispatch<React.SetStateAction<string>>;
  /** Firebase `email` can be null or undefined. */
  setEmail: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  userName: string | null | undefined;
  email: string | null | undefined;
  phoneNumberWithoutCountryCode: string;
  /** Dial code; with or without the leading "+" depending on who set it last. */
  countryCode: string | null | undefined;
  setCountryCode: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  setIsOTP: React.Dispatch<React.SetStateAction<boolean>>;
}

const NewUserModal = ({
  showNewUser,
  setShowNewUser,
  setUserName,
  setPhoneNumberWithoutCountryCode,
  setEmail,
  userName,
  email,
  phoneNumberWithoutCountryCode,
  countryCode,
  setCountryCode,
  setIsOTP,
}: NewUserModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
  const authType = useSelector((state: RootState) => state.User.authType);
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const city = useSelector((state: RootState) => state.City.city);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);

  const [loading, setLoading] = useState(false);
  const [friendCode, setFriendCode] = useState<string | null>(null);

  // New states for Profile Image
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (showNewUser && authType == "google" && isDemoModeOn(setting)) {
      setPhoneNumberWithoutCountryCode("");
    }
  }, [showNewUser]);

  const {
    fields: customFields,
    values: customFieldValues,
    handleChange: handleCustomFieldChange,
    getMissingRequired,
  } = useCustomFields({ enabled: showNewUser, languageId: language?.id });

  const handleChangeUserName = (e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value);
  const handleChangeEmail = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const handleChangePhoneNumber = (e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumberWithoutCountryCode(e.target.value);
  const handleFriendCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => setFriendCode(e.target.value);

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

  const handleUserRegister = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    e.preventDefault();
    try {
      if (authType == "phone" && userName == null) {
        toast.error(t("username_required"));
        setLoading(false);
        return;
      }

      const missingField = getMissingRequired();
      if (missingField) {
        toast.error(`${missingField} ${t("is_required")}`);
        setLoading(false);
        return;
      }

      // If your API expects FormData for file uploads:
      const formData = {
        name: userName,
        email: email,
        mobile: phoneNumberWithoutCountryCode,
        country_code: countryCode as string,
        type: authType,
        friend_code: friendCode,
        profile: profileImage, // Added profile image here
        customFields: customFieldValues,
      };

      const result = await api.registerUser(formData);

      if (result?.status == 1) {
        const tokenSet = await dispatch(setTokenThunk(result?.data?.access_token));
        await getCurrentUser();
        dispatch(setAuthType({ data: authType }));
        dispatch(setIsGuest({ data: false }));
        await handleFetchSetting();

        // The guest cart is merged by CartDrawer (WEB_PARITY_V4.0.2 §1.8).
        await fetchCart();
        setLoading(false);
        setShowNewUser(false);
        setIsOTP(false);
      } else {
        toast.error(t(result?.message as string));
        setLoading(false);
      }
    } catch (error) {
      console.log("error", error);
      setLoading(false);
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

  const getCurrentUser = async () => {
    try {
      const response = await api.getUser();
      dispatch(setCurrentUser({ data: response.user }));
      toast.success(t("login_success"));
    } catch (error) {
      console.log("error", error);
    }
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
        const productsData = getProductData(response.data);
        // Undefined only if a status-1 response has no `cart` (stored as-is).
        dispatch(setCartProducts({ data: productsData as CartLine[] }));
        dispatch(setCartSubTotal({ data: response?.data?.sub_total }));
        dispatch(setSelfPickupMode({ data: response?.data?.self_pickup_mode as Numeric | undefined }));
        dispatch(
          setDoorStepDeliveryMode({
            data: response?.data?.doorstep_delivery_mode as Numeric | undefined,
          })
        );
      } else {
        dispatch(setCart({ data: null }));
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const getProductData = (cartData: CartData) => {
    return cartData?.cart?.map((product) => ({
      product_id: product?.product_id,
      product_variant_id: product?.product_variant_id,
      qty: product?.qty,
    }));
  };

  return (
    <Dialog open={showNewUser}>
      <DialogContent className="bg-[var(--surface-default)]">
        <DialogHeader className="flex flex-row justify-between items-center">
          <div className="">
            <h1 className="text-3xl font-bold text-[var(--foreground-primary)]">{t("register")}</h1>
          </div>
          <div className="bg-[var(--surface-subtle)] rounded-full p-[8px] gap-[4px] cursor-pointer">
            <RiCloseFill size={22} className="text-[var(--button-link-foreground-default)]" onClick={() => setShowNewUser(false)} />
          </div>
        </DialogHeader>
        <div>
          <p className="text-xs text-center mb-2 text-[var(--foreground-tertiary)]">
            {t("update_your_profile_note")}
          </p>

          {/* Profile Image Upload Section */}
          <div className="flex flex-col items-center mb-4">
            <div
              className="relative w-24 h-24 rounded-full overflow-hidden border border-[var(--border-default)] cursor-pointer flex items-center justify-center bg-[var(--surface-subtle)]"
              onClick={() => fileInputRef.current!.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <RiCameraLine size={30} className="text-[var(--foreground-placeholder)]" />
              )}
              <div className="absolute bottom-0 w-full bg-black/40 py-1 flex justify-center">
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

          <div className="flex flex-col gap-2">
            {/* ... Existing Input Fields ... */}
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base text-[var(--form-default-label)]">{t("name")}</span>
              <input
                type="text"
                className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm disabled:text-[var(--foreground-disabled)]"
                placeholder={t("name")}
                value={userName as string}
                disabled={authType == "email" || authType == "google"}
                onChange={handleChangeUserName}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base text-[var(--form-default-label)]">{t("email")}</span>
              <input
                type="text"
                className="py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm disabled:text-[var(--foreground-disabled)]"
                placeholder={t("email")}
                value={email as string}
                disabled={authType == "email" || authType == "google"}
                onChange={handleChangeEmail}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base text-[var(--form-default-label)]">{t("mobileNumber")}</span>
              <PhoneInput
                country={setting?.nation_code?.toLowerCase() || process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE}
                value={(countryCode || "").replace("+", "") + phoneNumberWithoutCountryCode}
                onChange={(phone, data: Partial<CountryData>) => {
                  const dialCode = data?.dialCode || "";
                  const phoneWithoutDialCode = phone.startsWith(dialCode)
                    ? phone.slice(dialCode.length)
                    : phone;
                  setPhoneNumberWithoutCountryCode(phoneWithoutDialCode);
                  setCountryCode("+" + dialCode);
                }}
                disabled={authType == "phone"}
                containerClass="w-full "
                inputClass="!w-full !py-2 !pl-12 !pr-4 !outline-none !rounded-sm !h-[40px] disabled:!text-[var(--foreground-disabled)]"
                buttonClass="!rounded-sm"
                placeholder={t("mobileNumber")}
                inputProps={{
                  placeholder: t("mobileNumber"),
                }}
              />
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
            <button
              className="bg-[var(--button-secondary-background-default)] hover:bg-[var(--button-secondary-background-hover)] py-2 my-2 px-4 cursor-pointer text-[var(--button-secondary-foreground-default)] text-center rounded-sm text-xl font-normal transition-colors"
              onClick={handleUserRegister}
            >
              {loading ? t("loading") : t("register")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewUserModal;