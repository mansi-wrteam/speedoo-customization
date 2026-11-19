import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoModeOn } from "./demoMode";
import type { AppSettings } from "@/types/models";

const setting = (fields: Partial<AppSettings>) => fields as AppSettings;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isDemoModeOn", () => {
  // Trap 12: this one flag is a number while its neighbours are strings, so
  // `=== "1"` reads a switched-ON shop as off.
  it("reads the flag however it is typed", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(isDemoModeOn(setting({ is_demo_mode_on: 1 }))).toBe(true);
    expect(isDemoModeOn(setting({ is_demo_mode_on: "1" }))).toBe(true);
  });

  it("is off when the flag says so, or is missing entirely", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(isDemoModeOn(setting({ is_demo_mode_on: 0 }))).toBe(false);
    expect(isDemoModeOn(setting({}))).toBe(false);
    expect(isDemoModeOn(null)).toBe(false);
  });

  it("falls back to the build-time switch only when the API sends no flag", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    expect(isDemoModeOn(setting({}))).toBe(true);
    expect(isDemoModeOn(null)).toBe(true);
  });

  // The admin panel wins over .env in both directions.
  it("lets the API switch demo mode off even when .env turns it on", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    expect(isDemoModeOn(setting({ is_demo_mode_on: 0 }))).toBe(false);
    expect(isDemoModeOn(setting({ is_demo_mode_on: "0" }))).toBe(false);
  });

  it("lets the API switch demo mode on even when .env leaves it off", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    expect(isDemoModeOn(setting({ is_demo_mode_on: 1 }))).toBe(true);
  });
});
