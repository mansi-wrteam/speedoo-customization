// Demo mode (WEB_PARITY_V4.0.2 §10).
//
// The backend sends ONLY the switch. The demo mobile and OTP live in the
// client and always will — the backend will never send them.
import type { AppSettings } from "@/types/models/settings";

type Maybe<T> = T | null | undefined;

/**
 * The admin panel's `is_demo_mode_on` decides, both ways: `1` fills the demo
 * credentials, `0` removes them even when the build turned demo mode on.
 *
 * Trap 12: the flag arrives as a NUMBER (`1`) while every flag beside it is a
 * string, so a `=== "1"` test silently reads it as off. Compare loosely.
 *
 * `NEXT_PUBLIC_DEMO_MODE` is only the fallback for a backend that does not send
 * the field yet (emarket.wrteam.me today). It used to be OR-ed in, which made
 * `.env` override an admin who had switched demo mode off.
 */
export const isDemoModeOn = (setting: Maybe<AppSettings>) => {
  const flag = String(setting?.is_demo_mode_on ?? "").trim();
  if (flag !== "") return flag === "1";
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
};

/** Client-side constants; the OTP is still verified by the server, so this is a convenience, not a bypass. */
export const DEMO_MOBILE = process.env.NEXT_PUBLIC_DEMO_LOGIN_NO || "";
export const DEMO_OTP = process.env.NEXT_PUBLIC_DEMO_OTP || "";
