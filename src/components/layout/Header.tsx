import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaMoon, FaRegUser, FaSun, FaUser } from "react-icons/fa";
import * as api from "@/api/apiRoutes";
import {
  IoCartOutline,
  IoLocationOutline,
  IoHome,
  IoHomeOutline,
  IoGrid,
  IoGridOutline,
  IoHeart,
  IoHeartOutline,
  IoLanguage,
  IoChevronDownOutline,
} from "react-icons/io5";
import { LuUser } from "react-icons/lu";
import SocialIcon from "../common/SocialIcon";
import { BiCaretRight } from "react-icons/bi";
import CartDrawer from "../cart/CartDrawer";
// import Login from "../login/Login";
import { t } from "@/utils/translation";
import { useDispatch, useSelector } from "react-redux";
import dynamic from "next/dynamic";
const Location = dynamic(() => import("../locationmodal/Location"), {
  ssr: false,
});
const Login = dynamic(() => import("../login/Login"), {
  ssr: false,
});
// const CartDrawer = dynamic(() => import("../cart/CartDrawer"), {
//   ssr: false,
// });
const LogoutModal = dynamic(() => import("../logoutmodal/LogoutModal"), {
  ssr: false,
});
const ProfileDrawer = dynamic(
  () => import("../profiledashboard/ProfileDrawer"),
  {
    ssr: false,
  },
);
import {
  BiBell,
  BiBookmarkHeart,
  BiCartAlt,
  BiUserCircle,
  BiWallet,
  BiCart,
} from "react-icons/bi";
import { RiLogoutCircleRLine } from "react-icons/ri";
import { LuMapPin } from "react-icons/lu";
import { LocalizedLink } from "@/utils/localizedNav";
import { useRouter } from "next/router";
import { setCity } from "@/redux/slices/citySlice";
import { writeCityCookie, writeLangCookie, writeModuleCookie } from "@/utils/ssrCookies";
import { setLocalTheme } from "@/redux/slices/themeSlice";
import { useTheme } from "next-themes";
// import LogoutModal from "../logoutmodal/LogoutModal";
// import ProfileDrawer from "../profiledashboard/ProfileDrawer";
import { closeCartDrawer, openCartDrawer, setLocationModalOpen } from "@/redux/slices/uiSlice";
import {
  setFilterSearch,
  setProductBySearch,
  setSearchedCategory,
} from "@/redux/slices/productFilterSlice";
import SearchComponent from "../search/SearchComponent";
import ModuleButton from "../module-button/ModuleButton";
import ModuleIcon from "../module-button/ModuleIcon";
import { getModulePrimary } from "@/utils/applyTheme";
import { setModules, setActiveModule } from "@/redux/slices/moduleSlice";
import { useModuleHomePrefetch } from "@/utils/homeQueries";
import { getActiveStore } from "@/redux/storeAccess";
import GroceryIcon from "../module-button/GroceryIcon";
import PharmacyIcon from "../module-button/PharmacyIcon";
import { useSsrMediaQuery } from "@/utils/useSsrMediaQuery";
import { RiCloseFill } from "react-icons/ri";
import { setSelectedLanguage } from "@/redux/slices/languageSlice";
import ImageWithPlaceholder from "@/components/image-with-placeholder/ImageWithPlaceholder";
import { resolveLogoUrl } from "@/lib/utils";

import { CiSun } from "react-icons/ci";
import { FiMoon } from "react-icons/fi";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id } from "@/types/common";
import type { Language, LanguageListItem } from "@/types/models";

const Header = () => {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const themes = useSelector((state: RootState) => state.Theme);
  const cart = useSelector((state: RootState) => state.Cart);
  const setting = useSelector((state: RootState) => state.Setting);
  const user = useSelector((state: RootState) => state.User);
  const city = useSelector((state: RootState) => state.City);
  const filter = useSelector((state: RootState) => state.ProductFilter);
  const language = useSelector((state: RootState) => state.Language);
  const fcmToken = useSelector((state: RootState) => state.User?.fcm_token);

  // Device Width Checking
  const isMobile = useSsrMediaQuery({ query: "(max-width: 765px)" });

  // Cart + checkout live in the drawer, so its open flag is global: the header
  // icon, the floating cart bar and the /cart and /checkout routes all open it.
  const showCart = useSelector((state: RootState) => state.Ui.cartDrawerOpen);
  const [showLogin, setShowLogin] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [mobileActiveKey, setMobileActiveKey] = useState(1);
  const [selectedTab, setSelectedTab] = useState("profile");
  const [showProfile, setShowProfile] = useState(false);

  // Shared so Home can open the picker when it has no coordinates (§8).
  const showLocation = useSelector((state: RootState) => state.Ui.locationModalOpen);
  // On phones the "Open in app" banner goes first; the picker opens after it.
  const appBannerOpen = useSelector((state: RootState) => state.Ui.appBannerOpen);
  // Typed as a state setter because LocationModal takes one; the updater form
  // is resolved against the current redux value.
  const setShowLocation: React.Dispatch<React.SetStateAction<boolean>> = (value) =>
    dispatch(
      setLocationModalOpen(typeof value === "function" ? value(showLocation) : value)
    );
  const [loading, setLoading] = useState(false);

  const [mobileSearch, setMobileSearch] = useState(false);
  const [searchCatId, setSearchCatId] = useState<Id>("");
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isSuggLoading, setIsSuggLoading] = useState(false);
  const modules = useSelector((state: RootState) => state.Module.modules);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const moduleThemes = useSelector((state: RootState) => state.Theme.moduleThemes);
  // Pills tint with the theme that is actually applied (Home holds the old one
  // until the new module's content is ready), so they never run ahead of it.
  const displayedModuleId = useSelector((state: RootState) => state.Ui.displayedModuleId);
  const themeModuleId = displayedModuleId ?? activeModuleId;
  const prefetchModuleHome = useModuleHomePrefetch();
  const moduleGuestItems = (cart?.guestCart || []).filter(
    (i) => i.module_id == activeModuleId
  );
  const guestCount = moduleGuestItems.length;
  const guestTotal = moduleGuestItems.reduce(
    (s, i) => s + (Number(i.productPrice) || 0) * (Number(i.qty) || 0),
    0
  );

  useEffect(() => {
    if (router?.pathname !== "/products") {
      dispatch(setFilterSearch({ data: "" }));
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const res = await api.getModules();
      const list = res?.data || [];
      dispatch(setModules({ data: list }));
      // Read the CURRENT module (the URL reader may have set it from a shared
      // link while getModules was in flight) so we don't clobber it.
      const current = getActiveStore().getState()?.Module?.activeModuleId;
      if (list.length && !current) {
        dispatch(setActiveModule({ data: list[0].id }));
      }
    } catch (error) {
      console.log("modules error", error);
    }
  };

  useEffect(() => {
    // if mobile screen is dragged to desktop screen close the mobile search
    if (isMobile === false && mobileSearch === true) {
      setMobileSearch(false);
    }
  }, [isMobile]);
  useEffect(() => {
    fetchCity();
  }, [setting]);
  // Bottom-nav tab that owns a route: 1 Home, 2 Categories, 3 Profile, 4 Wishlist.
  // 0 = no tab: /products, product pages, sellers… are not Home, so nothing lights up.
  const tabForPath = (path: string) =>
    path.startsWith("/profile/wishlist")
      ? 4
      : path.includes("/profile")
        ? 3
        : path.startsWith("/categories")
          ? 2
          : path === "/"
            ? 1
            : 0;

  // The route owns the active tab. While the profile drawer or Login is open,
  // the tab that opened it stays lit; closing either hands it back to the page.
  useEffect(() => {
    if (!showProfile && !showLogin) setMobileActiveKey(tabForPath(router.pathname));
  }, [showProfile, showLogin, router.pathname]);

  const handleChangeTheme = (theme: string) => {
    setTheme(theme);
    dispatch(setLocalTheme({ data: theme }));
  };

  const handleLanguageChange = async (language: LanguageListItem) => {
    if (language?.code === router.query.lang) return;
    try {
      const response = await api.getSystemLanguages({
        id: language?.id,
        isDefault: 0,
        systemType: 3,
      });
      if (response.status == 1) {
        // Cookie so the SERVER renders this language on a URL with no ?lang.
        writeLangCookie((response?.data as Language)?.code);
        dispatch(setSelectedLanguage({ data: response?.data as Language }));
        // document.documentElement.dir = response?.data?.type;

        // Keep URL in sync when language is changed via dropdown
        router.replace({
          pathname: router.pathname,
          query: { ...router.query, lang: (response?.data as Language)?.code },
        });

        // Only for a SIGNED-IN visitor with a push token.
        //
        // `update_fcm_token` is an authenticated endpoint: it tells the backend
        // which language to send this user's push notifications in. A guest has
        // no token, so the call came back 401 — and the response interceptor
        // treats any 401 as "session expired" and dispatches `logoutAuth()`.
        // So switching language while logged out fired a failed request and a
        // pointless logout on every change, and surfaced as a runtime error.
        //
        // Nothing to register when there is no account and no push token, so
        // the call is simply skipped. Failures stay non-fatal: the language has
        // already been applied above, and push language is a preference, not
        // something worth interrupting the UI for.
        if (user?.jwtToken && fcmToken) {
          try {
            await api.updateFcmToken({
              langaugeId: (response?.data as Language)?.admin_lang_id_for_fcm,
              fcmToken,
            });
          } catch (fcmError) {
            console.log("fcm language update failed", fcmError);
          }
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const fetchCity = async () => {
    try {
      if (setting?.setting?.default_city && city?.city == null) {
        const latitude = parseFloat(setting.setting.default_city?.latitude as string);
        const longitude = parseFloat(setting.setting.default_city?.longitude as string);
        const response = await api.getCity({
          latitude: latitude,
          longitude: longitude,
        });
        if (response.status === 1) {
          writeCityCookie(response.data);
          dispatch(setCity({ data: response.data }));
        } else {
          setShowLocation(true);
        }
      } else if (
        setting?.setting &&
        setting.setting?.default_city == null &&
        city?.city == null
      ) {
        setShowLocation(true);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleCartOpen = () => {
    dispatch(openCartDrawer());
  };

  const handleLoginOpen = () => {
    setShowLogin(true);
  };

  const handleOpenLocation = () => {
    setShowLocation(true);
  };

  const handleHomeClick = () => {
    setMobileActiveKey(1);
    router.push("/");
  };

  const handleProfileClick = () => {
    setMobileActiveKey(3);
    if (user?.jwtToken) {
      setShowProfile(true);
    } else {
      setShowLogin(true);
    }
  };

  const handleSearchCategory = (value: Id) => {
    setSearchCatId(value);
    dispatch(setSearchedCategory({ data: value }));
  };

  const handleSearchData = async (searchValue: string) => {
    setIsSuggLoading(true);
    try {
      const response = await api.getProductByFilter({
        latitude: city?.city?.latitude,
        longitude: city?.city?.longitude,
        filters: {
          search: searchValue,
          category_id: filter?.searchedCategory,
        },
      });
      dispatch(setProductBySearch({ data: response?.data }));
      setIsSuggLoading(false);
    } catch (error) {
      console.log("Error", (error as Error)?.message);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.trim() === "") {
      dispatch(setProductBySearch({ data: [] }));
      dispatch(setFilterSearch({ data: "" }));
      clearTimeout(typingTimeout!);
      return;
    }
    setIsSuggLoading(true);
    dispatch(setFilterSearch({ data: e.target.value }));
    dispatch(setSearchedCategory({ data: searchCatId }));
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    const timeout = setTimeout(() => {
      handleSearchData(e.target.value);
    }, 2000);
    setTypingTimeout(timeout);
  };

  // Bottom nav tab keys: 1 Home, 2 Categories, 3 Profile, 4 Wishlist.
  const handleCategoriesClick = () => {
    setMobileActiveKey(2);
    router.push("/categories/all");
  };

  // Wishlist needs an account, same as Profile: signed out → Login.
  const handleWishlistClick = () => {
    setMobileActiveKey(4);
    if (user?.jwtToken) {
      router.push("/profile/wishlist");
    } else {
      setShowLogin(true);
    }
  };

  // Compact label for the mobile language pill, e.g. "En" for `en`.
  const languageCode =
    language?.selectedLanguage?.code || (router?.query?.lang as string) || "en";
  const languageLabel =
    languageCode.charAt(0).toUpperCase() + languageCode.slice(1).toLowerCase();

  return (
    <>
      <section className="relative z-40 border-b border-[var(--border-subtle)]">
        <div className="w-full bg-[var(--brand-background-default)] top-header text-[var(--foreground-inverse)]  md:block hidden">
          <div className="container  flex justify-between items-center h-[40px] px-2">
            <div className="min-w-0 flex-1">
              {(setting?.setting?.social_media?.length as number) > 0 && (
                <div className="flex min-w-0 items-center gap-3 whitespace-nowrap">
                  {/* Label drops on narrow desktops so the icons keep their room. */}
                  <p className="hidden shrink-0 lg:block">{t("follow_us")}</p>
                  {/* Dividers only BETWEEN icons (divide-x), none after the last. */}
                  <ul className="flex min-w-0 items-center divide-x divide-[var(--foreground-inverse)]/30 overflow-hidden">
                    {setting?.setting?.social_media?.map((social) => (
                      <li key={social?.id} className="shrink-0 px-2 first:ps-0 lg:px-3">
                        <LocalizedLink
                          href={social?.link || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social?.name}
                          className="flex items-center justify-center transition-opacity hover:opacity-80"
                        >
                          <SocialIcon
                            image={social?.image_url}
                            alt={social?.name}
                            className="size-4 object-contain"
                          />
                        </LocalizedLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-[8px] flex-last">
              <button
                type="button"
                onClick={() =>
                  handleChangeTheme(themes?.theme == "light" ? "dark" : "light")
                }
                aria-label={t(themes?.theme == "light" ? "dark" : "light")}
                className="w-[100px] border-none flex items-center gap-2 justify-center text-[var(--foreground-inverse)] cursor-pointer"
              >
                {themes?.theme == "light" ? <FaSun /> : <FaMoon />}
                {t(themes?.theme)}
              </button>
              <DropdownMenu>
                {(language?.availableLanguages?.length as number) > 1 ? (
                  <DropdownMenuTrigger className="w-[100px] border-none flex items-center gap-2 justify-center text-[var(--foreground-inverse)]">
                    <IoLanguage />{" "}
                    {language?.selectedLanguage
                      ? language?.selectedLanguage?.name
                      : "English"}
                  </DropdownMenuTrigger>
                ) : (
                  <button className="w-[100px] border-none flex items-center gap-2 justify-center text-[var(--foreground-inverse)]">
                    <IoLanguage />{" "}
                    {language?.selectedLanguage
                      ? language?.selectedLanguage?.name
                      : "English"}
                  </button>
                )}

                <DropdownMenuContent className="w-[100px] ">
                  {language?.availableLanguages &&
                    language?.availableLanguages?.map((language) => {
                      return (
                        <DropdownMenuItem
                          onSelect={() => handleLanguageChange(language)}
                          key={language?.id}
                          className="flex gap-2"
                        >
                          {language?.name}
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="bg-[var(--surface-default)] pb-0 relative">
          <div className="center-header bg-[var(--surface-default)] container">
            <div className="  px-2 flex justify-between items-center gap-4 pb-[8px] md:py-2 lg:py-3 border-b border-[var(--border-subtle)]  md:border-none py-2">
              <div className="  relative order-1 h-[38px] lg:h-12 w-[140px] lg:w-[170px] shrink-0">
                <LocalizedLink href={"/"} className="relative block w-full h-full">
                  {/* Wait for settings; then a missing or broken logo shows the admin placeholder. */}
                  {setting?.setting?.web_settings && (
                    <ImageWithPlaceholder
                      src={resolveLogoUrl(setting?.setting?.web_settings, themes?.theme)}
                      alt="Logo"
                      sizes="170px"
                      priority={true}
                      className="object-contain"
                    />
                  )}
                </LocalizedLink>
              </div>
              <div className="hidden lg:flex flex-1 order-2 items-center gap-4 min-w-0">
                <div
                  className="flex h-12 items-center gap-2 px-3 py-1 bg-[var(--form-default-background)] border border-[var(--form-default-border)] rounded-lg cursor-pointer shrink-0"
                  onClick={handleOpenLocation}
                >
                  <IoLocationOutline
                    size={20}
                    className="text-[var(--foreground-tertiary)] shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-[var(--foreground-tertiary)]">
                      {t("deliver_to")}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-sm font-medium text-[var(--foreground-primary)] line-clamp-1 max-w-40">
                        {city.status === "fulfill" ? (
                          city?.city?.formatted_address
                        ) : (
                          <div className="d-flex justify-content-center">
                            <div className="spinner-border" role="status">
                              <span className="visually-hidden">
                                {t("loading")}
                              </span>
                            </div>
                          </div>
                        )}
                      </span>
                      <IoChevronDownOutline
                        size={12}
                        className="text-[var(--foreground-primary)] shrink-0"
                      />
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <SearchComponent
                    isSuggLoading={isSuggLoading}
                    isMobile={isMobile}
                    handleSearchCategory={handleSearchCategory}
                    handleSearch={handleSearch}
                  />
                </div>
              </div>
              <div className=" gap-6 order-3 hidden md:flex lg:flex items-center ">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={handleCartOpen}
                >
                  <span className="p-3 bg-[var(--brand-background-subtle)] rounded-full relative">
                    <BiCart size={24} className="text-[var(--brand-foreground-default)]" />
                    {cart.isGuest == true ? (
                      <p
                        className={
                          guestCount != 0
                            ? "flex absolute top-[-7px] right-0 bg-[var(--foreground-primary)] text-[var(--foreground-inverse)] rounded-full h-[20px] w-[20px] items-center justify-center text-center font-bold text-sm"
                            : "none"
                        }
                      >
                        {" "}
                        {guestCount != 0
                          ? guestCount
                          : null}
                      </p>
                    ) : (
                      <p
                        className={
                          cart?.cartProducts?.length != 0
                            ? "flex absolute bg-[var(--foreground-primary)] text-[var(--foreground-inverse)] top-[-7px] right-0 rounded-full text-center h-5 w-5 items-center justify-center p-1 font-bold text-sm"
                            : "none"
                        }
                      >
                        {" "}
                        {cart?.cartProducts?.length != 0
                          ? cart?.cartProducts?.length
                          : null}
                      </p>
                    )}
                  </span>
                  <div className="flex flex-col ">
                    <span className="text-sm text-[var(--foreground-tertiary)]">{t("your_cart")}</span>
                    <span className="text-base font-medium text-[var(--foreground-primary)]">
                      {setting.setting && setting.setting.currency}
                      {cart.isGuest == true
                        ? guestTotal?.toFixed(
                            setting?.setting?.decimal_point
                              ? (setting?.setting?.decimal_point as number)
                              : 0,
                          )
                        : (cart?.cartSubTotal as number)?.toFixed(
                            setting?.setting?.decimal_point
                              ? (setting?.setting?.decimal_point as number)
                              : 0,
                          )}
                    </span>
                  </div>
                </div>
                {user?.jwtToken !== "" ? (
                  <div className="flex gap-2 items-center cursor-pointer">
                    <div className="flex ">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center border-none outline-none gap-1 p-2 shadow-none bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-full">
                          <span className="size-8 flex items-center justify-center rounded-full bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)] font-medium text-base">
                            {user?.user?.name?.charAt(0)?.toUpperCase() || (
                              <LuUser size={16} />
                            )}
                          </span>
                          <span className="text-[var(--foreground-primary)] font-normal text-base">
                            {t("profile")}
                          </span>
                          <IoChevronDownOutline size={16} className="text-[var(--foreground-primary)]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <LocalizedLink href={"/profile"}>
                            <DropdownMenuItem className="items-center flex justify-start h-full">
                              <span className="flex p-2 gap-2 text-base font-semibold bg-transparent">
                                <BiUserCircle size={22} />
                                {t("editProfile")}
                              </span>
                            </DropdownMenuItem>
                          </LocalizedLink>
                          <LocalizedLink href={"/profile/activeorders"}>
                            <DropdownMenuItem className="items-center flex justify-start h-full">
                              <span className="flex p-2 gap-2  text-base font-semibold bg-transparent">
                                <BiCartAlt size={22} />
                                {t("orders")}
                              </span>
                            </DropdownMenuItem>
                          </LocalizedLink>
                          <LocalizedLink href={"/profile/wishlist"}>
                            <DropdownMenuItem className="items-center flex justify-start h-full">
                              <span className="flex p-2 gap-2 text-base font-semibold bg-transparent">
                                <BiBookmarkHeart size={22} />
                                {t("wishlist")}
                              </span>
                            </DropdownMenuItem>
                          </LocalizedLink>
                          <LocalizedLink href={"/profile/notifications"}>
                            <DropdownMenuItem className="items-center flex justify-start h-full">
                              <span className="flex p-2 gap-2 text-base font-semibold bg-transparent">
                                <BiBell size={22} />
                                {t("notification")}
                              </span>
                            </DropdownMenuItem>
                          </LocalizedLink>

                          <LocalizedLink href={"/profile/address"}>
                            <DropdownMenuItem className="items-center flex justify-start h-full">
                              <span className="flex p-2 gap-2 text-base font-semibold bg-transparent">
                                <IoLocationOutline size={22} />
                                {t("myAddress")}
                              </span>
                            </DropdownMenuItem>
                          </LocalizedLink>
                          <LocalizedLink href={"/profile/wallet-credit"}>
                            <DropdownMenuItem className="items-center flex justify-start h-full">
                              <span className="flex p-2 gap-2 text-base font-semibold bg-transparent">
                                <BiWallet size={22} />
                                {t("walletBalance")}
                              </span>
                            </DropdownMenuItem>
                          </LocalizedLink>
                          <DropdownMenuItem className="items-center flex justify-start h-full">
                            <span
                              className="flex p-2 gap-2 text-base font-semibold bg-transparent"
                              onClick={() => setShowLogout(true)}
                            >
                              <RiLogoutCircleRLine size={20} />
                              {t("logout")}
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex gap-1 items-center cursor-pointer px-4 py-2 bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] rounded-lg"
                    onClick={handleLoginOpen}
                  >
                    <LuUser size={16} className="text-[var(--button-primary-foreground-default)]" />
                    <span className="text-base font-medium text-[var(--button-primary-foreground-default)]">
                      {t("login")}
                    </span>
                  </div>
                )}
              </div>
              {/* Mobile action group: language + cart + theme, right aligned.
                  Language is mobile-only — from md up the top bar carries its
                  own language dropdown, so keeping it here would duplicate it. */}
              <div className="flex md:hidden gap-3 order-3 items-center text-[var(--foreground-primary)]">
                {(language?.availableLanguages?.length as number) > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                      {languageLabel}
                      <IoChevronDownOutline size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-[140px] border-[var(--border-subtle)] bg-[var(--surface-default)]"
                    >
                      {language?.availableLanguages?.map((lng) => (
                        <DropdownMenuItem
                          key={lng?.id}
                          onSelect={() => handleLanguageChange(lng)}
                          className="text-base text-[var(--foreground-primary)]"
                        >
                          {lng?.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                    {languageLabel}
                  </span>
                )}
                <div onClick={handleCartOpen} className="relative cursor-pointer">
                  <IoCartOutline size={24} />{" "}
                  {cart.isGuest == true ? (
                    <p
                      className={
                        guestCount != 0
                          ? "flex absolute  bottom-4 left-4 bg-[var(--foreground-primary)] text-[var(--foreground-inverse)] rounded-full h-[18px] w-[18px] items-center justify-center text-center font-semibold text-xs"
                          : "none"
                      }
                    >
                      {" "}
                      {guestCount != 0
                        ? guestCount
                        : null}
                    </p>
                  ) : (
                    <p
                      className={
                        cart?.cartProducts?.length != 0
                          ? "flex absolute bg-[var(--foreground-primary)] text-[var(--foreground-inverse)] bottom-4 left-4 rounded-full text-center h-4 w-4 items-center justify-center p-1 font-bold text-sm"
                          : "none"
                      }
                    >
                      {" "}
                      {cart?.cartProducts?.length != 0
                        ? cart?.cartProducts?.length
                        : null}
                    </p>
                  )}
                </div>
                <div className="cursor-pointer">
                  {themes?.theme == "light" ? (
                    <CiSun
                      onClick={() => handleChangeTheme("dark")}
                      size={24}
                    />
                  ) : (
                    <FiMoon
                      onClick={() => handleChangeTheme("light")}
                      size={24}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Module pills row — desktop only. The separator sits on a full-width
              wrapper so the rule spans the viewport, while the pills themselves
              stay aligned to the container. */}
          {modules.length > 1 && (
            <div className="hidden lg:block border-t border-[var(--border-subtle)]">
              <div className="container flex items-center gap-4 py-4 overflow-x-auto flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {modules.map((m) => (
                  <ModuleButton
                    key={m.id}
                    className="shrink-0"
                    label={m?.translations?.name ?? m?.name}
                    icon={
                      m?.image_url ? (
                        <ModuleIcon
                          src={m.image_url}
                          // Every pill takes the ACTIVE module's colour. The
                          // active pill is already filled with it, so its icon
                          // stays untinted and the button inverts it to white.
                          color={
                            m.id === activeModuleId
                              ? "currentColor"
                              : getModulePrimary(moduleThemes, themeModuleId) ||
                                "currentColor"
                          }
                          className="size-6"
                        />
                      ) : null
                    }
                    isActive={m.id === activeModuleId}
                    onClick={() => {
                      // Cookie so the SERVER renders this module next time;
                      // localStorage is invisible to it.
                      writeModuleCookie(m.id);
                      dispatch(setActiveModule({ data: m.id }));
                    }}
                    onIntent={() => prefetchModuleHome(m.id)}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="bottom-header lg:hidden">
            {/* Mobile/Tablet module row (from API) — hidden when only one module */}
            {modules.length > 1 && (
              <div className="flex gap-3 container mx-auto px-2 mt-2 mb-2 overflow-x-auto flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {modules.map((m) => (
                  <ModuleButton
                    key={m.id}
                    label={m?.translations?.name ?? m?.name}
                    icon={
                      m?.image_url ? (
                        <ModuleIcon
                          src={m.image_url}
                          // Every pill takes the ACTIVE module's colour. The
                          // active pill is already filled with it, so its icon
                          // stays untinted and the button inverts it to white.
                          color={
                            m.id === activeModuleId
                              ? "currentColor"
                              : getModulePrimary(moduleThemes, themeModuleId) ||
                                "currentColor"
                          }
                          className="size-4"
                        />
                      ) : null
                    }
                    isActive={m.id === activeModuleId}
                    onClick={() => {
                      // Cookie so the SERVER renders this module next time;
                      // localStorage is invisible to it.
                      writeModuleCookie(m.id);
                      dispatch(setActiveModule({ data: m.id }));
                    }}
                    onIntent={() => prefetchModuleHome(m.id)}
                    className="shrink-0"
                    size="sm"
                  />
                ))}
              </div>
            )}
            <div className="container mx-auto flex md:grid md:grid-cols-12 md:items-center justify-between mt-2 mb-2 md:mb-4 px-2 ">
              {/* First column: col-3 equivalent */}
              <div
                className=" md:col-span-4 flex gap-2 items-center cursor-pointer"
                onClick={handleOpenLocation}
              >
                <span className="p-2 bg-[var(--brand-background-subtle)] rounded-full shrink-0">
                  <IoLocationOutline size={24} className="text-[var(--brand-foreground-default)]" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm text-[var(--foreground-tertiary)]">
                      {t("deliver_to")}
                    </span>
                    <IoChevronDownOutline size={12} className="text-[var(--foreground-tertiary)]" />
                  </span>
                  <span className="text-base font-medium text-[var(--foreground-primary)] line-clamp-1  lg:max-w-64">
                    <>
                      {city.status === "fulfill" ? (
                        city?.city?.formatted_address
                      ) : (
                        <div className="d-flex justify-content-center">
                          <div className="spinner-border" role="status">
                            <span className="visually-hidden">
                              {t("loading")}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  </span>
                </div>
              </div>
            </div>
            {/* Mobile/Tablet inline search bar */}
            <div className="container mx-auto px-2 mb-2">
              <SearchComponent
                isSuggLoading={isSuggLoading}
                isMobile={isMobile}
                handleSearchCategory={handleSearchCategory}
                handleSearch={handleSearch}
              />
            </div>
          </div>
        </div>
        <Sheet open={mobileSearch} onOpenChange={setMobileSearch}>
          <SheetContent
            className="p-0 w-full sm:w-[900px]"
            side={language?.selectedLanguage?.type == "RTL" ? "left" : "right"}
          >
            <SheetHeader>
              <SheetTitle className="flex justify-between px-4 py-2 items-center">
                {t("search")}
                <SheetTrigger className="focus:outline-none cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]">
                  <RiCloseFill size={22} />
                </SheetTrigger>
              </SheetTitle>
              <SheetDescription>
                <SearchComponent
                  isSuggLoading={isSuggLoading}
                  isMobile={isMobile}
                  mobileSearch={mobileSearch}
                  setMobileSearch={setMobileSearch}
                  handleSearch={handleSearch}
                  handleSearchCategory={handleSearchCategory}
                />
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <CartDrawer
          showCart={showCart}
          onClose={() => dispatch(closeCartDrawer())}
          setMobileActiveKey={setMobileActiveKey}
        />
        <Login
          showLogin={showLogin}
          setShowLogin={setShowLogin}
          setMobileActiveKey={setMobileActiveKey}
        />
        {showLocation && !appBannerOpen && (
          <Location
            showLocation={showLocation}
            setShowLocation={setShowLocation}
          />
        )}
        <LogoutModal showLogout={showLogout} setShowLogout={setShowLogout} />
      </section>
      {/* Mobile bottom nav (Figma): white rounded card; active tab = brand
          filled icon, primary label, and a brand tab peeking up from the
          bottom edge. Others = outline icon, secondary label. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden"
        aria-label="primary"
      >
        <div className="mx-auto flex max-w-md items-center overflow-hidden rounded-2xl bg-[var(--surface-default)] shadow-[0px_8px_38px_0px_rgba(0,0,0,0.08),0px_12px_32px_0px_rgba(0,0,0,0.04)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
          {[
            {
              key: 1,
              Icon: IoHomeOutline,
              ActiveIcon: IoHome,
              label: t("home"),
              onClick: handleHomeClick,
            },
            {
              key: 2,
              Icon: IoGridOutline,
              ActiveIcon: IoGrid,
              label: t("categories"),
              onClick: handleCategoriesClick,
            },
            {
              key: 4,
              Icon: IoHeartOutline,
              ActiveIcon: IoHeart,
              label: t("wishlist"),
              onClick: handleWishlistClick,
            },
            {
              key: 3,
              Icon: FaRegUser,
              ActiveIcon: FaUser,
              label: user?.jwtToken ? t("profile") : t("login"),
              onClick: handleProfileClick,
            },
          ].map(({ key, Icon, ActiveIcon, label, onClick }) => {
            const isActive = mobileActiveKey == key;
            return (
              <button
                key={key}
                type="button"
                onClick={onClick}
                aria-current={isActive ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden px-3 py-4"
              >
                {isActive ? (
                  <ActiveIcon size={22} className="text-[var(--brand-foreground-default)]" />
                ) : (
                  <Icon size={22} className="text-[var(--foreground-primary)]" />
                )}
                <span
                  className={`text-xs font-medium leading-4 ${
                    isActive
                      ? "text-[var(--foreground-primary)]"
                      : "text-[var(--foreground-secondary)]"
                  }`}
                >
                  {label}
                </span>
                {/* Active marker: rounded tab rising from the bottom edge. */}
                <span
                  aria-hidden
                  className={`absolute left-1/2 h-6 w-10 -translate-x-1/2 rounded-[10px] bg-[var(--brand-background-default)] transition-all duration-300 ease-out ${
                    isActive ? "-bottom-[18px]" : "-bottom-6"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </nav>
      <ProfileDrawer
        showProfile={showProfile}
        setShowProfile={setShowProfile}
        setSelectedTab={setSelectedTab}
        selectedTab={selectedTab}
      />
    </>
  );
};

export default Header;
