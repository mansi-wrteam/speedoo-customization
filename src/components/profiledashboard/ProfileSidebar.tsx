import { LocalizedLink } from "@/utils/localizedNav";
import React, { useEffect, useState } from "react";
import { useLocalizedRouter } from "@/utils/localizedNav";
import WalletBalanceModal from "./wallet/WalletBalanceModal";
import { useSelector } from "react-redux";
import { t } from "@/utils/translation";
import Image from "next/image";
import ImageWithPlaceholder from "@/components/image-with-placeholder/ImageWithPlaceholder";
import LogoutModal from "../logoutmodal/LogoutModal";
import DeleteModal from "../deleteModal/DeleteModal";
import { BiCartAlt, BiCog, BiUserCircle, BiWallet } from "react-icons/bi";
import ReferAndEarnModal from "@/components/refer-and-earn/ReferAndEarnModal";
import LightImage from "@/assets/Vector.svg";
import MoneyImage from "@/assets/bx-money.svg";
import BikeImage from "@/assets/bike.svg";
import { FaArrowRight } from "react-icons/fa";
import { formatDate } from "@/utils/helperFunction";
import { ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import type { RootState } from "@/types/state";

export interface ProfileSidebarProps {
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
  /** Not read: the highlighted item comes from `router.pathname`. */
  selectedTab: string;
}

const ProfileSidebar = ({ setSelectedTab, selectedTab }: ProfileSidebarProps) => {
  const router = useLocalizedRouter();
  const user = useSelector((state: RootState) => state.User.user);
  const authType = useSelector((state: RootState) => state.User.authType);
  const setting = useSelector((state: RootState) => state?.Setting?.setting);

  const [addWalletModal, setAddWalletModal] = useState(false);
  const [showReferAndEarn, setShowReferAndEarn] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tabName: string) => {
    setSelectedTab(tabName);
  };

  const handleWalletBalanceModal = () => {
    setAddWalletModal(true);
  };

  const handleShowReferAndEarn = () => {
    setShowReferAndEarn(true);
  };

  const activeTab = router.pathname.split("/").pop();

  const slides = [
    {
      id: 1,
      text: `${t("subscribe")} ${user?.subscription_name}`,
      image: (
        <div className="p-2 md:p-1.5 lg:p-2 bg-[var(--status-success-default)] rounded-full border border-[var(--surface-default)] h-9 w-9 md:h-7 md:w-7 lg:w-9 lg:h-9 shrink-0">
          <Image
            src={LightImage}
            alt="light logo"
            className={`h-5 w-5 md:w-4 md:h-4 lg:w-5 lg:h-5 object-contain `}
            height={20}
            width={20}
            unoptimized
          />
        </div>
      ),
      theme: "border-[var(--status-success-border)] bg-[var(--status-success-background)] text-[var(--status-success-foreground)]",
    },
    {
      id: 2,
      text: t("go_max_save_more"),
      image: (
        <div className="p-2 md:p-1.5 lg:p-2 bg-[var(--status-information-default)] rounded-full border border-[var(--surface-default)] h-9 w-9 md:h-7 md:w-7 lg:w-9 lg:h-9 flex items-center shrink-0">
          <Image
            src={MoneyImage}
            alt="light logo"
            className={`h-6 w-6 md:w-4 md:h-4 lg:w-6 lg:h-6 object-contain `}
            height={20}
            width={20}
          />
        </div>
      ),
      theme: "border-[var(--status-information-border)] bg-[var(--status-information-background)] text-[var(--status-information-foreground)]",
    },
    {
      id: 3,
      text: t("free_delivery_desc"),
      image: (
        <div className="p-2 md:p-1.5 lg:p-2 bg-[var(--status-warning-default)] rounded-full border border-[var(--surface-default)] h-9 w-9 md:h-7 md:w-7 lg:w-9 lg:h-9 shrink-0">
          <Image
            src={BikeImage}
            alt="light logo"
            className={`h-5 w-5 md:w-4 md:h-4 lg:w-5 lg:h-5 object-contain `}
            height={20}
            width={20}
          />
        </div>
      ),
      theme: "border-[var(--status-warning-border)] bg-[var(--status-warning-background)] text-[var(--status-warning-foreground)]",
    },
  ];

  const handleSubscriptionClick = () => {
    router.push("/profile/subscription");
  };
  const handleDelete = () => {
    if (user!.balance! > 0) {
      toast.error(t("withdraw_it_before_deleting"));
      return;
    }
    setShowDelete(true);
  };

  return (
    <div>
      <div className="rounded-2xl overflow-hidden outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
        {user?.is_subscription_plans ? (
          <div className="bg-[var(--surface-subtle)] flex flex-col md:p-4 lg:p-6 p-4 gap-6">
            <div className="flex items-center gap-6 md:gap-2 lg:gap-6">
              {/* Avatar */}
              <div
                className="h-28 w-28 md:h-[56px] md:w-[56px] lg:h-[96.62px] lg:w-[96.62px] rounded-full border border-[var(--border-default)] bg-[var(--surface-default)] flex items-center justify-center p-[2.32px] shrink-0"
              >
                <ImageWithPlaceholder
                  src={user?.profile}
                  alt="Profile"
                  width={100}
                  height={100}
                  className="h-full w-full rounded-full object-cover shrink-0"
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[var(--foreground-secondary)]">{t("hello")},</p>
                <p className="text-xl md:text-[16px] lg:text-xl font-bold text-[var(--foreground-primary)] ">
                  {user?.name}
                </p>
              </div>
            </div>
            <div className="h-px w-full bg-[var(--border-default)]"></div>
            <div className="flex gap-6 flex-col">
              <div className="flex gap-3">
                {user?.has_active_subscription == 1 ? (
                  <div className="flex md:flex-col lg:flex-row items-start w-full justify-between md:gap-1 lg:justify-between">
                    <div className="flex gap-2 md:gap-1 lg:gap-2">
                      <div className="p-[5.5px] md:p-1 lg:p-[5.5px] gap-[6px] bg-[var(--status-success-default)] rounded-full border border-[var(--surface-default)] h-8 w-8 md:h-6 md:w-6 lg:h-8 lg:w-8 shrink-0">
                        <Image
                          src={LightImage}
                          alt="light logo"
                          className={`h-full w-full object-contain `}
                          height={24}
                          width={24}
                        />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="font-bold text-base text-nowrap">
                          {user?.user_subscription_plan_name}
                        </h2>
                        <p className="text-sm leading-[17px] font-normal">
                          {`${t("expires_on")} ${formatDate(user?.subscription_expiry_date)}`}
                        </p>
                      </div>
                    </div>
                    <span className="bg-[var(--status-success-default)] text-[var(--status-success-on-status)] ml-0 md:ml-6 lg:ml-0 text-sm font-semibold px-3 py-1 md:px-2 md:py-0.5 lg:px-3 lg:py-1  rounded-full">
                      {t("active")}
                    </span>
                  </div>
                ) : user?.has_active_subscription == 2 ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex  md:flex-col lg:flex-row items-start w-full justify-between gap-2 ">
                      <div className="flex gap-[12px] ">
                        <div className="p-[5.5px] md:p-1 lg:p-[5.5px] gap-[6px] bg-[var(--status-success-default)] rounded-full border border-[var(--surface-default)] h-8 w-8 md:h-6 md:w-6 lg:h-8 lg:w-8 shrink-0">
                          <Image
                            src={LightImage}
                            alt="light logo"
                            className={`h-full w-full object-contain `}
                            height={24}
                            width={24}
                          />
                        </div>
                        <div className="flex flex-col">
                          <h2 className="font-bold text-base">
                            {user?.subscription_name}
                          </h2>
                          <p className="text-sm leading-[17px] font-normal">
                            {t("expired_plan_desc")}
                          </p>
                        </div>
                      </div>

                      <span className="bg-[var(--status-error-default)] text-[var(--status-error-on-status)] text-sm font-semibold px-3 py-1 rounded-full ">
                        {t("expired")}
                      </span>
                    </div>
                    <button
                      className="bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] text-xl md:text-[16px] lg:text-xl font-semibold px-4 md:px-0 lg:px-4 py-2 rounded-md flex items-center gap-2 justify-center w-auto md:w-[190px] lg:w-auto"
                      onClick={handleSubscriptionClick}
                    >
                      {`${t("renew")} ${user?.subscription_name}`}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col w-3/4 ">
                    <h2 className="font-bold text-base">
                      {user?.subscription_name}
                    </h2>
                    <p className="text-sm leading-[17px] font-normal ">
                      {t("subscription_desc")}
                    </p>
                  </div>
                )}
              </div>
              {user?.has_active_subscription == 0 && (
                <div className="flex justify-center ">
                  <div
                    className={`relative h-14 w-full max-w-sm overflow-hidden rounded border-[1.5px] transition-colors duration-500 ${slides[current].theme} rounded-md`}
                  >
                    {slides.map((slide, index) => (
                      <div
                        key={slide.id}
                        className={`absolute inset-0 flex items-center justify-center font-semibold transition-all duration-500 ease-in-out cursor-pointer `}
                        style={{
                          transform: `translateY(${(index - current) * 100}%)`,
                          opacity: index === current ? 1 : 0,
                        }}
                        onClick={handleSubscriptionClick}
                      >
                        <div className="flex gap-2 items-center font-bold justify-between px-4 md:px-1 lg:px-4 w-full">
                          <div className="flex gap-2 items-center">
                            {slide.image}
                            <div className="text-sm lg:text-[16px]">
                            {slide.text}
                            </div>
                          </div>
                          <div>
                            <FaArrowRight />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[var(--surface-subtle)] ">
            <div className="flex items-center p-4">
              <ImageWithPlaceholder
                src={user?.profile}
                alt="Profile"
                height={48}
                width={48}
                className="rounded-sm"
              />
              <div className="ml-3">
                <p className="text-base text-[var(--foreground-primary)]">{t("hello")},</p>
                <p className="text-xl  font-semibold text-[var(--foreground-primary)]">{user?.name}</p>
              </div>
            </div>
          </div>
        )}

        <div className="">
          <div className=" ">
            <h3 className="text-base font-semibold text-[var(--foreground-primary)] flex items-center border-b border-[var(--border-subtle)] p-4">
              <BiUserCircle className="mr-2 text-[var(--foreground-primary)]" size={20} />{" "}
              {t("account_manage")}
            </h3>
            <ul>
              <LocalizedLink href={`/profile`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "profile"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("profile")}
                >
                  <span className="font-medium ml-12 md:ml-[0] lg:ml-12">
                    {t("editProfile")}
                  </span>
                </li>
              </LocalizedLink>
              {(authType == "email" ||
                (authType == "phone" && setting?.phone_auth_password == 1)) && (
                  <LocalizedLink href={`/profile/resetpassword`}>
                    <li
                      className={`p-4  cursor-pointer opacity-[0.76] ${
                        activeTab == "resetpassword"
                          ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                          : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                      }`}
                      onClick={() => handleTabChange("profile")}
                    >
                      <span className="font-medium ml-12 md:ml-[0] lg:ml-12">
                        {t("resetPassword")}
                      </span>
                    </li>
                  </LocalizedLink>
                )}

              <LocalizedLink href={`/profile/address`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "address"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("address")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("manage_address")}
                  </span>
                </li>
              </LocalizedLink>
              {(user?.has_active_subscription as number) > 0 && (
                <LocalizedLink href={`/profile/subscription`}>
                  <li
                    className={`p-4  cursor-pointer opacity-[0.76] ${
                      activeTab == "subscription"
                        ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                        : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                    }`}
                    onClick={() => handleTabChange("subscription")}
                  >
                    <span className="ml-12 md:ml-[0] lg:ml-12">
                      {user?.subscription_name}
                    </span>
                  </li>
                </LocalizedLink>
              )}
            </ul>
          </div>

          {/* Orders & Wishlist Manage Section */}
          <div className="">
            <h3 className="text-base font-semibold text-[var(--foreground-primary)]  flex items-center p-4 border-b border-[var(--border-subtle)]">
              <BiCartAlt className="mr-2 text-[var(--foreground-primary)]" size={20} />
              {`${t("orders")} & ${t("wishlist")} ${t("manage")}`}
            </h3>
            <ul>
              <LocalizedLink href={`/profile/activeorders`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "activeorders"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("activeorders")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("active_orders")}
                  </span>
                </li>
              </LocalizedLink>

              <LocalizedLink href={`/profile/orderhistory`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "orderhistory"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("orderhistory")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("order_history")}
                  </span>
                </li>
              </LocalizedLink>
              <LocalizedLink href={`/profile/wishlist`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "wishlist"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("wishlist")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("my_wishlist")}
                  </span>
                </li>
              </LocalizedLink>
            </ul>
          </div>

          {/* Payment Manage Section */}
          <div className="">
            <h3 className="text-base font-semibold text-[var(--foreground-primary)] flex items-center p-4 border-b border-[var(--border-subtle)]">
              <BiWallet className="mr-2 text-[var(--foreground-primary)]" size={20} />{" "}
              {`${t("payment")} ${t("manage")}`}
            </h3>
            <ul>
              <li className="flex flex-nowrap md:flex-wrap lg:flex-nowrap justify-between items-center p-4 rounded  text-[var(--foreground-primary)]">
                <span className="ml-12 md:ml-[0] lg:ml-12">
                  {t("walletBalance")}
                </span>
                <span className="text-base font-semibold leading-6 text-[var(--brand-foreground-default)] bg-[var(--brand-background-subtle)] p-2 rounded-lg">
                  {setting?.currency}
                  {user?.balance}
                </span>
              </li>
              <li
                className={`p-4  cursor-pointer  opacity-[0.76] ${
                  activeTab == "add-balance"
                    ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                    : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                }`}
                onClick={handleWalletBalanceModal}
              >
                <span className="ml-12 md:ml-[0] lg:ml-12">
                  {t("addWalletBalance")}
                </span>
              </li>
              <LocalizedLink href={`/profile/wallethistory`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "wallethistory"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("wallethistory")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("wallet_history")}
                  </span>
                </li>
              </LocalizedLink>

              <LocalizedLink href={`/profile/transaction`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "transaction"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("transaction")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("transaction_history")}
                  </span>
                </li>
              </LocalizedLink>
            </ul>
          </div>

          {/* Other Settings Section */}
          <div className="">
            <h3 className="text-base font-semibold flex items-center p-4 border-b border-[var(--border-subtle)]">
              <BiCog className="mr-2 text-[var(--foreground-primary)]" size={20} />{" "}
              {`${t("address_type_other")} ${t("setting")}`}
            </h3>
            <ul>
              <LocalizedLink href={`/profile/notifications`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "notifications"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("notifications")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("notification")}
                  </span>
                </li>
              </LocalizedLink>
              <LocalizedLink href={`/profile/notification-setting`}>
                <li
                  className={`p-4 cursor-pointer opacity-[0.76] ${
                    activeTab == "notification-setting"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("notification_setting")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("notification_setting")}
                  </span>
                </li>
              </LocalizedLink>
              <LocalizedLink href={`/profile/requested-products`}>
                <li
                  className={`p-4  cursor-pointer opacity-[0.76] ${
                    activeTab == "requested-products"
                      ? "bg-[var(--brand-background-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)] opacity-100"
                      : "hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100"
                  }`}
                  onClick={() => handleTabChange("requested-products")}
                >
                  <span className="ml-12 md:ml-[0] lg:ml-12">
                    {t("requestedProducts")}
                  </span>
                </li>
              </LocalizedLink>
              <li
                className={`p-4  cursor-pointer  text-[var(--foreground-primary)] opacity-[0.76] hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100`}
                onClick={() => handleShowReferAndEarn()}
              >
                <span className="ml-12 md:ml-[0] lg:ml-12">
                  {t("referandearn")}
                </span>
              </li>
              <li
                className={`p-4 rounded cursor-pointer opacity-[0.76] text-[var(--foreground-primary)] hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100`}
                onClick={() => setShowLogout(true)}
              >
                <span className="ml-12 md:ml-[0] lg:ml-12">{t("logout")}</span>
              </li>
              <li
                className={`p-4 rounded cursor-pointer opacity-[0.76] text-[var(--foreground-primary)] hover:bg-[var(--brand-background-subtle)] hover:text-[var(--brand-foreground-default)] hover:opacity-100`}
                onClick={handleDelete}
              >
                <span className="ml-12 md:ml-[0] lg:ml-12">
                  {t("delete_account")}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <WalletBalanceModal
          addWalletModal={addWalletModal}
          setAddWalletModal={setAddWalletModal}
        />
        <ReferAndEarnModal
          showReferAndEarn={showReferAndEarn}
          setShowReferAndEarn={setShowReferAndEarn}
        />
        <LogoutModal showLogout={showLogout} setShowLogout={setShowLogout} />
        <DeleteModal showDelete={showDelete} setShowDelete={setShowDelete} />
      </div>
    </div>
  );
};

export default ProfileSidebar;
