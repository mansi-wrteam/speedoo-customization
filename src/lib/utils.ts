import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getActiveStore } from "@/redux/storeAccess";
import type { Numeric } from "@/types/common";
import type { WebSettings } from "@/types/models/settings";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// True when an HTML string has no meaningful content — covers null/undefined,
// empty strings, and markup like "<p></p>", "<br>", "&nbsp;" or whitespace only.
export function isEmptyHtml(html: unknown) {
  if (!html) return true;
  const text = String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\s/g, "");
  return text.length === 0;
}

export function formatCustomDate(dateString: string | null | undefined) {
  if (!dateString) return;

  const isoCompatibleString = dateString.replace(/Z+$/, "Z");
  // NOTE: for removing the zz from created At which return Nan
  // const isoCompatibleString = dateString.replace(" ", "T") + "Z";
  const date = new Date(isoCompatibleString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const isPM = hours >= 12;
  const formattedHours = String(hours % 12 || 12).padStart(2, "0");
  const ampm = isPM ? "PM" : "AM";

  return `${day}-${month}-${year}, ${formattedHours}:${minutes}:${seconds} ${ampm}`;
}

export const formatOnlyDate = (dateString: string | null | undefined) => {
  if (!dateString) return;

  const isoCompatibleString = dateString.replace(/Z+$/, "Z");
  // NOTE: for removing the zz from created At which return Nan
  // const isoCompatibleString = dateString.replace(" ", "T") + "Z";
  const date = new Date(isoCompatibleString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Prices show at least two decimals: 34 -> "34.00", 1963.5 -> "1963.50".
// Prices that already carry two or more decimals from the API (23.80, 34.890)
// are left as-is.
export const formatPriceDisplay = <T extends Numeric | null | undefined>(amount: T) => {
  const num = Number(amount);
  if (amount == null || Number.isNaN(num)) return amount;
  const decimals = String(amount).split(".")[1]?.length ?? 0;
  return decimals >= 2 ? amount : num.toFixed(2);
};

// Formats an API amount (number or numeric string) to the store's configured
// decimal_point setting. Returns the raw value untouched when it isn't numeric.
export const formatAmount = <T extends Numeric | null | undefined>(amount: T, decimalPoint?: Numeric | null) => {
  const num = Number(amount);
  if (amount == null || amount === "" || Number.isNaN(num)) return amount;
  return num.toFixed(decimalPoint ? Number(decimalPoint) : 0);
};

// Splits [minPrice, maxPrice] into ~4 "nice number" buckets (steps of 1/2/5/10
// x a power of 10) so a price filter can show round ranges like 100-300,
// 300-500 instead of arbitrary decimals. Last bucket may be narrower than the
// rest since it's clipped to maxPrice.
export const buildPriceRanges = (minPrice: number, maxPrice: number) => {
  if (maxPrice <= minPrice) return [];

  const rawStep = (maxPrice - minPrice) / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceSteps = [1, 2, 5, 10];

  let factor = niceSteps[0];
  for (const value of niceSteps) {
    if (Math.abs(normalized - value) < Math.abs(normalized - factor)) {
      factor = value;
    }
  }

  const step = factor * magnitude;
  const ranges = [];
  let start = minPrice;
  while (start < maxPrice) {
    const end = Math.min(start + step, maxPrice);
    ranges.push({ start, end });
    start = end;
  }
  return ranges;
};

export const isRtl = () => {
  const state = getActiveStore().getState();
  const isLangRtl =
    state?.Language?.selectedLanguage?.type == "RTL" ? true : false;
  return isLangRtl;
};

/**
 * Resolve a card's background color (category / brand / country).
 * Mode-agnostic: prefer the item's own color (item-wise), else fall back to the
 * root/global color. Works for both the shop API (with mode) and the listing
 * APIs (no mode field). `mode` is accepted but optional/ignored.
 * Returns null when transparent/empty so the card keeps its default bg.
 */
// Resolve the header/login/location-modal logo for the active theme.
// dark_web_logo is a newer field — some payloads send it as a relative
// storage path ("front_end/web_logo/...") instead of the full URL web_logo
// already carries, so prefix it with the API's storage base when needed.
// Falls back to web_logo when there's no dark logo set, or in light mode.
export const resolveLogoUrl = (webSettings: WebSettings | null | undefined, theme: string | undefined) => {
  const lightLogo = webSettings?.web_logo;
  if (theme !== "dark") return lightLogo;
  const darkLogo = webSettings?.dark_web_logo;
  if (!darkLogo) return lightLogo;
  if (/^https?:\/\//i.test(darkLogo)) return darkLogo;
  return `${process.env.NEXT_PUBLIC_API_URL}/storage/${darkLogo}`;
};

export const resolveCardBg = ({ item, globalLight, globalDark, isDark }: {
  item?: { background_color_for_light_theme?: string | null; background_color_for_dark_theme?: string | null } | null;
  globalLight?: string | null;
  globalDark?: string | null;
  isDark?: boolean;
  /** Accepted but ignored (see comment above). */
  mode?: unknown;
}) => {
  const isEmpty = (c: string | null | undefined) => !c || c === "#00000000" || c === "transparent";
  let color = isDark
    ? item?.background_color_for_dark_theme
    : item?.background_color_for_light_theme;
  if (isEmpty(color)) color = isDark ? globalDark : globalLight;
  if (isEmpty(color)) return null;
  return color;
};
