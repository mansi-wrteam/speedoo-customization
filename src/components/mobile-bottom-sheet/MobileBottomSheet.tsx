import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAppBannerOpen } from "@/redux/slices/uiSlice";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Check, ChevronRight, Smartphone } from "lucide-react";
import { t } from "@/utils/translation";
import { androidLink, appScheme, playStoreLink, schemeLink } from "@/utils/appLink";
import type { RootState } from "@/types/state";

const KNOB_SIZE = 48;
const TRACK_PADDING = 6;
/** Share of the track the knob must cross before letting go counts as "open". */
const COMPLETE_AT = 0.85;

interface SwipeToOpenProps {
  label: string;
  onComplete: () => void;
}

/**
 * Slide-to-unlock style control: drag the knob to the far end to open the app.
 * Enter / Space on the knob does the same, for keyboard and screen-reader users.
 */
const SwipeToOpen = ({ label, onComplete }: SwipeToOpenProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  // Measured on each grab. direction is -1 in RTL: the knob starts on the right.
  const [maxOffset, setMaxOffset] = useState(0);
  const [direction, setDirection] = useState(1);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const complete = (max: number) => {
    setOffset(max);
    setDone(true);
    onComplete();
    // Spring back so the control is usable again if the user returns to the tab.
    setTimeout(() => {
      setDone(false);
      setOffset(0);
    }, 1200);
  };

  const measure = () => {
    const track = trackRef.current;
    if (!track) return { max: 0, dir: 1 };
    const max = track.clientWidth - KNOB_SIZE - TRACK_PADDING * 2;
    const dir = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    setMaxOffset(max);
    setDirection(dir);
    return { max, dir };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (done) return;
    measure();
    startX.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const dx = (e.clientX - startX.current) * direction;
    setOffset(Math.min(Math.max(dx, 0), maxOffset));
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (maxOffset > 0 && offset >= maxOffset * COMPLETE_AT) {
      complete(maxOffset);
    } else {
      setOffset(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (done || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    complete(measure().max);
  };

  const progress = maxOffset > 0 ? offset / maxOffset : 0;
  // Snap back / finish with a spring; follow the finger 1:1 while dragging.
  const motion = dragging ? "none" : "transform 350ms cubic-bezier(.2,.9,.3,1.2), width 350ms cubic-bezier(.2,.9,.3,1.2)";

  return (
    <div
      ref={trackRef}
      className="relative mt-6 h-[60px] select-none overflow-hidden rounded-full border border-[var(--brand-border-default)]/20 bg-[var(--brand-background-subtle)]"
    >
      <style>{`@keyframes swipeShimmer{from{background-position:200% 0}to{background-position:-200% 0}}@keyframes swipeNudge{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}`}</style>

      {/* Brand fill that trails the knob. */}
      <div
        aria-hidden
        className="absolute inset-y-0 start-0 rounded-full bg-[var(--button-primary-background-default)]"
        style={{ width: offset + KNOB_SIZE + TRACK_PADDING * 2, transition: motion, opacity: 0.18 + progress * 0.82 }}
      />

      {/* Label fades out as the knob covers it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 ps-12"
        style={{ opacity: Math.max(0, 1 - progress * 1.6) }}
      >
        <span className="bg-[linear-gradient(90deg,var(--foreground-secondary)_0%,var(--brand-foreground-default)_50%,var(--foreground-secondary)_100%)] bg-[length:200%_100%] bg-clip-text text-base font-semibold text-transparent [animation:swipeShimmer_2.6s_linear_infinite]">
          {label}
        </span>
        <span className="flex text-[var(--brand-foreground-default)] [animation:swipeNudge_1.4s_ease-in-out_infinite] rtl:-scale-x-100">
          <ChevronRight size={16} strokeWidth={2.5} className="opacity-40" />
          <ChevronRight size={16} strokeWidth={2.5} className="-ms-2.5 opacity-70" />
          <ChevronRight size={16} strokeWidth={2.5} className="-ms-2.5" />
        </span>
      </div>

      <button
        type="button"
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`absolute start-[6px] top-[5px] flex touch-none items-center justify-center rounded-full bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-background-muted)] ${dragging ? "cursor-grabbing scale-105" : "cursor-grab"}`}
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          transform: `translateX(${offset * direction}px)`,
          transition: motion,
        }}
      >
        {done ? (
          <Check size={22} strokeWidth={2.75} />
        ) : (
          // The phone spins like a rolling wheel: one full turn across the track.
          <span
            className="flex"
            style={{ transform: `rotate(${progress * 360 * direction}deg)`, transition: motion }}
          >
            <Smartphone size={20} strokeWidth={2.25} />
          </span>
        )}
      </button>
    </div>
  );
};

export interface MobileBottomSheetProps {
  isOpen?: boolean;
}

/** Same key as before, now in localStorage: "Stay in web" holds per device (DEEPLINK_SPEC.md §0). */
const DISMISSED_KEY = "hasClosedBottomSheet";
/** If the page is still showing this long after the attempt, the app didn't open. */
const APP_OPEN_TIMEOUT_MS = 2500;

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

const detectPlatform = () => {
  if (typeof navigator === "undefined") return { isAndroid: false, isIOS: false };
  const userAgent = navigator.userAgent || "";
  return {
    isAndroid: /android/i.test(userAgent),
    // iPadOS reports itself as a Mac; touch support gives it away.
    isIOS:
      /iPad|iPhone|iPod/.test(userAgent) ||
      (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1),
  };
};

const MobileBottomSheet = ({ isOpen = true }: MobileBottomSheetProps) => {
  // Read the dismissal up front: the Layout remounts this on every route change,
  // and starting open then closing in an effect flashes the sheet each time.
  const [dismissed, setDismissed] = useState(readDismissed);
  const [showAppNotInstalledPopup, setShowAppNotInstalledPopup] =
    useState(false);
  const settings = useSelector((state: RootState) => state.Setting.setting);
  const dispatch = useDispatch();
  const fallbackTimer = useRef<number | undefined>(undefined);

  const appName = process.env.NEXT_PUBLIC_WEB_NAME || "egrocer";
  const displayName = settings?.app_name || appName;
  const appIcon = settings?.favicon;

  // Null until the admin enables it with a valid scheme: the banner then never
  // shows, rather than offering a link no app answers.
  const scheme = appScheme(settings);
  const { isAndroid, isIOS } = detectPlatform();
  const isPhoneWidth = typeof window !== "undefined" && window.innerWidth < 769;
  const isVisible = isOpen && !dismissed && !!scheme && isPhoneWidth;

  // Hold the location picker back while this is on screen (Header reads it).
  // Driven by what is actually shown, so a hidden banner never blocks it.
  useEffect(() => {
    dispatch(setAppBannerOpen(isVisible));
    return () => {
      dispatch(setAppBannerOpen(false));
    };
  }, [isVisible, dispatch]);

  const cancelFallback = () => {
    window.clearTimeout(fallbackTimer.current);
    fallbackTimer.current = undefined;
  };

  // The app opening sends this page to the background; that is the signal it
  // worked, so the "not installed" fallback is cancelled.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) cancelFallback();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", cancelFallback);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", cancelFallback);
      cancelFallback();
    };
  }, []);

  const handleClose = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Storage blocked: dismissed for this page view only.
    }
  };

  // Path AND query, so the app opens in the same module and language (§2.3).
  const currentPage = () => ({
    host: window.location.host,
    pathWithQuery: `${window.location.pathname}${window.location.search}`,
  });

  const handleOpenApp = () => {
    if (!scheme) return;
    const page = currentPage();
    const link = isAndroid
      ? androidLink(scheme, page, settings?.playstore_url)
      : schemeLink(scheme, page);

    cancelFallback();
    fallbackTimer.current = window.setTimeout(() => {
      fallbackTimer.current = undefined;
      if (!document.hidden) setShowAppNotInstalledPopup(true);
    }, APP_OPEN_TIMEOUT_MS);

    try {
      window.location.href = link;
    } catch (e) {
      console.error("Error opening app:", e);
      cancelFallback();
      setShowAppNotInstalledPopup(true);
    }
  };

  const handleDownloadApp = () => {
    setShowAppNotInstalledPopup(false);
    const storeLink = isIOS
      ? settings?.appstore_url
      : playStoreLink(settings?.playstore_url, currentPage());
    window.location.href =
      storeLink ||
      (isIOS
        ? `https://apps.apple.com/search?term=${encodeURIComponent(displayName)}`
        : `https://play.google.com/store/search?q=${encodeURIComponent(displayName)}&c=apps`);
  };

  if (!scheme || !isPhoneWidth) return null;

  return (
    <>
      {/* Tapping outside counts as "Stay in Web", so it isn't asked again on the next page. */}
      <Sheet open={isVisible} onOpenChange={(open) => (open ? setDismissed(false) : handleClose())}>
        <SheetContent
          side="bottom"
          className="inset-x-3 bottom-3 h-auto max-h-[85vh] overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-default)] p-0 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]"
        >
          {/* Brand glow behind the icon — follows the active module's theme. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[var(--brand-background-default)] opacity-25 blur-3xl"
          />

          <div className="relative px-5 pb-5 pt-3">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-[var(--border-default)]" />

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-[22px] bg-[var(--brand-background-default)] opacity-20 [animation-duration:2.4s]"
                />
                <div className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[var(--brand-background-default)] to-[var(--brand-background-pressed)] shadow-lg ring-4 ring-[var(--surface-default)]">
                  {appIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={appIcon} alt="" className="h-full w-full bg-[var(--surface-default)] object-contain p-2" />
                  ) : (
                    <span className="text-3xl font-bold text-[var(--brand-foreground-inverse)]">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <SheetTitle className="text-xl font-bold text-[var(--foreground-primary)]">
                {displayName}
              </SheetTitle>
              <SheetDescription className="mt-1 max-w-[260px] text-sm text-[var(--foreground-secondary)]">
                {t("betterExperienceInApp")}
              </SheetDescription>
            </div>

            <SwipeToOpen label={t("swipeToOpenApp")} onComplete={handleOpenApp} />
            <button
              className="mt-2 w-full rounded-2xl py-3 text-sm font-medium text-[var(--foreground-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground-primary)]"
              onClick={handleClose}
            >
              {t("stayInWeb")}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {showAppNotInstalledPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--surface-inverse)]/50 backdrop-blur-sm"
            onClick={() => setShowAppNotInstalledPopup(false)}
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-[var(--surface-default)] p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-bold text-[var(--foreground-primary)]">
              {/* t() only looks up the key; fill {appName} (or {{appName}}) here. */}
              {(t("appNotInstalled") || "").replace(/\{\{?\s*appName\s*\}?\}/g, displayName)}
            </h3>
            <p className="mb-6 text-sm text-[var(--foreground-secondary)]">
              {isAndroid
                ? t("downloadPromptPlayStore")
                : t("downloadPromptAppStore")}
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-lg px-4 py-3 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                onClick={handleDownloadApp}
              >
                {isAndroid ? t("playStore") : t("appStore")}
              </button>
              <button
                className="flex-1 rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-base font-semibold text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]"
                onClick={() => setShowAppNotInstalledPopup(false)}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomSheet;
