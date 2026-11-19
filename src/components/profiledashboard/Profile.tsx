import React, { useState, useEffect, useMemo, use } from "react";
import { t } from "@/utils/translation";
import ImageWithPlaceholder from "@/components/image-with-placeholder/ImageWithPlaceholder";
import { FiEdit } from "react-icons/fi";
import { useSelector } from "react-redux";
import * as api from "@/api/apiRoutes";
import { setCurrentUser } from "@/redux/slices/userSlice";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import CustomFields from "../custom-fields/CustomFields";
import useCustomFields from "../custom-fields/useCustomFields";
import type { CountryData } from "react-phone-input-2";
import type { CustomFieldValues } from "@/api/apiRoutes";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";

const validateName = (name: string) => {
  if (!name.trim()) return "Name is required";
  if (name.length < 2) return "Name must be at least 2 characters";
  if (!/^[a-zA-Z\s]+$/.test(name))
    return t("name_can_contain_only_letters_and_spaces");
  return "";
};

const validateEmail = (email: string) => {
  if (!email.trim()) return "Email is required";
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return t("enter_a_valid_email_address");
  return "";
};

const validateMobile = (mobile: string) => {
  if (!mobile?.trim()) return "Mobile number is required";
  if (!/^[0-9]{6,16}$/.test(mobile))
    return t("enter_a_valid_mobile_number_with_at_least_6_digits");
  return "";
};

const validateImage = (file: File | null) => {
  if (!file) return "";
  const allowedTypes = ["image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type))
    return t("only_jpg_or_png_images_are_allowed");
};

const Profile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.User.user);
  const authType = useSelector((state: RootState) => state.User.authType);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);

  const [username, setUsername] = useState(user?.name);
  const [email, setEmail] = useState(user?.email);
  const [mobileNumber, setMobileNumber] = useState(user?.mobile);
  const [countryCode, setCountryCode] = useState(user?.country_code || process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || "in");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [isChanged, setIsChanged] = useState(false);
  // One save at a time: repeat clicks while a request is in flight used to
  // fire a request each, and stack one error toast per response.
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // user.custom_fields (from user_details) carries the customer's own saved
  // values per field id — same shape the register/new-user forms write via
  // custom_fields[id], just read back. Seed the edit form with them, and
  // keep the raw file URLs around separately so CustomFields can link to
  // whatever's currently on file without needing a real File object.
  const customFieldInitialValues = useMemo(() => {
    const map: CustomFieldValues = {};
    (user?.custom_fields || []).forEach((field) => {
      if (field?.value !== null && field?.value !== undefined) {
        map[field.id] = field.value;
      }
    });
    return map;
  }, [user?.custom_fields]);

  const savedFileUrls = useMemo(() => {
    const map: Record<string, string> = {};
    (user?.custom_fields || []).forEach((field) => {
      if (field?.type === "file" && field?.value) {
        // File fields hold the saved file's URL (a string).
        map[field.id] = field.value as string;
      }
    });
    return map;
  }, [user?.custom_fields]);

  const {
    fields: customFields,
    values: customFieldValues,
    handleChange: handleCustomFieldChange,
    getMissingRequired,
  } = useCustomFields({
    languageId: language?.id,
    initialValues: customFieldInitialValues,
  });

  useEffect(() => {
    setUsername(user?.name);
    setEmail(user?.email);
    setMobileNumber(user?.mobile);
    setCountryCode(user?.country_code || process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || "in");
  }, []);

  useEffect(() => {
    checkIfChecked();
  }, [username, email, mobileNumber, countryCode, profileImage, customFieldValues]);

  const onImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
    }
  };

  const checkIfChecked = () => {
    if (
      username !== user?.name ||
      email !== user?.email ||
      mobileNumber !== user?.mobile ||
      countryCode !== user?.country_code ||
      !user?.profileImage ||
      JSON.stringify(customFieldValues) !== JSON.stringify(customFieldInitialValues)
    ) {
      setIsChanged(true);
    } else {
      setIsChanged(false);
    }
  };

  const handlePhoneNoChange = (value: string, data: Partial<CountryData>) => {
    const dialCode = data?.dialCode || "";
    const phoneWithoutDialCode = value.startsWith(dialCode)
      ? value.slice(dialCode.length)
      : value;
    setMobileNumber(phoneWithoutDialCode);
    setCountryCode("+" + dialCode);
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const newErrors: Record<string, string | undefined> = {
      name: validateName(username as string),
      email:
        authType === "google" || authType === "email"
          ? ""
          : validateEmail(email as string),
      mobile: authType === "phone" ? "" : validateMobile(mobileNumber as string),
      image: validateImage(profileImage),
    };

    Object.keys(newErrors).forEach(
      (key) => !newErrors[key] && delete newErrors[key],
    );

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);

      Object.values(newErrors).forEach((error) => {
        toast.error(error, {
          toastId: error,
        });
      });

      return;
    }

    const missingField = getMissingRequired();
    if (missingField) {
      toast.error(`${missingField} ${t("is_required")}`);
      return;
    }

    setErrors({});
    setSubmitting(true);
    // Only send the mobile when it was edited: re-sending the saved (or an
    // empty) number trips the server's "already taken" check.
    const dial = (code?: string) => (code ?? "").replace("+", "");
    const mobileChanged =
      (mobileNumber ?? "") !== (user?.mobile ?? "") ||
      (!!user?.country_code && dial(countryCode) !== dial(user.country_code));
    try {
      const response = await api.updateProfile({
        name: username as string,
        email: email as string,
        mobileNumber: mobileChanged ? (mobileNumber as string) : undefined,
        country_code: countryCode,
        image: profileImage,
        type: authType,
        customFields: customFieldValues,
      });
      if (response?.status == 1) {
        const user = await api.getUser();
        dispatch(setCurrentUser({ data: user?.user }));
        toast.success(response.message);
      } else {
        // Same message replaces the visible toast instead of stacking.
        toast.error(response.message, { toastId: response.message });
      }
    } catch (error) {
      console.log("Error", error);
      toast.error("Something went wrong", { toastId: "profile-update-failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto h-fit overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="w-full bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)]">
        <h2 className="text-xl font-medium leading-7 text-[var(--foreground-primary)] p-4">{t("editProfile")}</h2>
      </div>
      <div className="items-center  flex flex-col">
        <form
          className="w-full  justify-center items-center flex flex-col"
          onSubmit={handleProfileUpdate}
        >
          <div className="flex flex-col w-[90%] md:w-1/2 pt-[48px] pb-[48px] gap-[48px]">
            <div className="flex justify-center ">
              <div className="relative">
                <div className="relative w-36 h-36  rounded-md flex items-center justify-center overflow-hidden">
                  {/* Placeholder when the user has no photo or it fails to load. */}
                  <ImageWithPlaceholder
                    src={
                      profileImage
                        ? URL.createObjectURL(profileImage)
                        : user?.profile
                    }
                    alt="profile image"
                    className="h-full w-full object-cover rounded-md"
                    sizes="148px"
                  />
                </div>
                <label
                  htmlFor="profileImage"
                  className="absolute bottom-0 right-0 p-3 rounded-lg cursor-pointer bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                >
                  <FiEdit className="text-lg" />
                </label>
                <input
                  type="file"
                  id="profileImage"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={onImageChange}
                />
              </div>
            </div>
            <div>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-normal leading-5 text-[var(--form-default-label)]">
                  {t("name")} <span className="text-[var(--form-default-required)]">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter your name"
                  className="mt-1 block w-full py-2 px-3 text-base font-normal leading-6 rounded-lg bg-[var(--form-default-background)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] disabled:text-[var(--foreground-disabled)]"
                  defaultValue={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                // NOTE: remove due to tester suggestion in 2.0.4 update
                // disabled={authType == "google"}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-normal leading-5 text-[var(--form-default-label)]">
                  {t("email")} <span className="text-[var(--form-default-required)]">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  className="mt-1 block w-full py-2 px-3 text-base font-normal leading-6 rounded-lg bg-[var(--form-default-background)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] disabled:text-[var(--foreground-disabled)]"
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={authType == "google" || authType == "email"}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="mobile" className="block text-sm font-normal leading-5 text-[var(--form-default-label)]">
                  {t("mobileNumber")} <span className="text-[var(--form-default-required)]">*</span>
                </label>
                <PhoneInput
                  country={process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || "in"}
                  value={countryCode.replace("+", "") + mobileNumber}
                  onChange={(phone, data) => handlePhoneNoChange(phone, data)}
                  disabled={authType == "phone"}
                  inputProps={{
                    name: "mobile",
                    id: "mobile",
                    required: true,
                    placeholder: t("mobileNumber"),
                  }}
                  containerClass="mt-1"
                  inputStyle={{ width: "100%" }}
                  inputClass="!w-full !h-full !rounded-lg !border !border-[var(--form-default-border)] !bg-[var(--form-default-background)] !text-[var(--form-default-text)] !py-2 !pl-12 !pr-4 disabled:!text-[var(--foreground-disabled)]"
                  buttonClass="!rounded-l-lg !border !border-[var(--form-default-border)] !bg-[var(--form-default-background)]"
                />
              </div>

              {customFields?.length > 0 && (
                <div className="flex flex-col gap-4">
                  <CustomFields
                    fields={customFields}
                    values={customFieldValues}
                    onChange={handleCustomFieldChange}
                    languageId={language?.id}
                    savedFileUrls={savedFileUrls}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end w-full">
            <button
              type="submit"
              className="px-6 py-3 rounded-lg text-xl font-medium leading-7 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)] disabled:cursor-not-allowed disabled:bg-[var(--button-secondary-background-disabled)] disabled:text-[var(--button-secondary-foreground-disabled)]"
              disabled={isChanged == false || submitting}
            >
              {t("editProfile")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
