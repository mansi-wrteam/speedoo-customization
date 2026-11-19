import { describe, expect, it } from "vitest";
import { androidLink, androidPackage, appScheme, iosAppId, playStoreLink, schemeLink } from "./appLink";
import type { AppSettings } from "@/types/models/settings";

const page = { host: "shop.test", pathWithQuery: "/product/fresh-milk?module=grocery&lang=en" };
const playstore = "https://play.google.com/store/apps/details?id=com.wrteam.egrocer";

const withDeeplink = (deeplink_settings: AppSettings["deeplink_settings"]): AppSettings => ({ deeplink_settings });

describe("appScheme", () => {
  it("returns the configured scheme", () => {
    expect(appScheme(withDeeplink({ deeplink_enabled: "1", deeplink_scheme: "egrocer" }))).toBe("egrocer");
    expect(appScheme(withDeeplink({ deeplink_scheme: " egrocer " }))).toBe("egrocer");
  });

  it("is off when not configured, as the live API sends it", () => {
    expect(appScheme(null)).toBeNull();
    expect(appScheme({})).toBeNull();
    expect(appScheme(withDeeplink({ deeplink_enabled: "0", deeplink_scheme: "" }))).toBeNull();
    expect(appScheme(withDeeplink({ deeplink_enabled: "1", deeplink_scheme: "" }))).toBeNull();
  });

  it("is off when switched off even with a scheme", () => {
    expect(appScheme(withDeeplink({ deeplink_enabled: "0", deeplink_scheme: "egrocer" }))).toBeNull();
    expect(appScheme(withDeeplink({ deeplink_enabled: 0, deeplink_scheme: "egrocer" }))).toBeNull();
  });

  it("rejects schemes that would fail silently", () => {
    for (const bad of ["eMarket", "egrocer://", "e grocer", "1app", "https://x"]) {
      expect(appScheme(withDeeplink({ deeplink_scheme: bad }))).toBeNull();
    }
  });
});

describe("store ids", () => {
  it("reads the Android package", () => {
    expect(androidPackage(playstore)).toBe("com.wrteam.egrocer");
    expect(androidPackage(`${playstore}&hl=en`)).toBe("com.wrteam.egrocer");
    expect(androidPackage("https://play.google.com/store/apps")).toBeNull();
    expect(androidPackage("not a url")).toBeNull();
    expect(androidPackage(undefined)).toBeNull();
  });

  it("reads the iOS app id", () => {
    expect(iosAppId("https://apps.apple.com/app/id1234567890")).toBe("1234567890");
    expect(iosAppId("https://apps.apple.com/in/app/egrocer/id1234567890?l=en")).toBe("1234567890");
    expect(iosAppId("https://apps.apple.com/")).toBeNull();
    expect(iosAppId(null)).toBeNull();
  });
});

describe("links", () => {
  it("keeps the query string on the scheme link", () => {
    expect(schemeLink("egrocer", page)).toBe("egrocer://shop.test/product/fresh-milk?module=grocery&lang=en");
  });

  it("carries the destination through a Play install, decoded twice by the app", () => {
    const link = playStoreLink(playstore, page)!;
    const referrer = new URLSearchParams(new URL(link).searchParams.get("referrer")!);
    expect(new URL(link).searchParams.get("id")).toBe("com.wrteam.egrocer");
    expect(referrer.get("deep_link")).toBe(page.pathWithQuery);
  });

  it("falls back to the configured store URL without a package", () => {
    expect(playStoreLink("https://example.test/app", page)).toBe("https://example.test/app");
    expect(playStoreLink(undefined, page)).toBeNull();
  });

  it("builds an intent:// link with a store fallback on Android", () => {
    const link = androidLink("egrocer", page, playstore);
    expect(link.startsWith("intent://shop.test/product/fresh-milk?module=grocery&lang=en#Intent;")).toBe(true);
    expect(link).toContain(";scheme=egrocer;package=com.wrteam.egrocer;");
    expect(link).toContain(`S.browser_fallback_url=${encodeURIComponent(playStoreLink(playstore, page)!)};`);
    expect(link.endsWith("end")).toBe(true);
  });

  it("uses the plain scheme link on Android without a package", () => {
    expect(androidLink("egrocer", page, undefined)).toBe(schemeLink("egrocer", page));
  });
});
