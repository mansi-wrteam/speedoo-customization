"use client";

import type { Id } from "@/types/common";
import type { ThemeFamily, ThemePayload } from "@/types/models/theme";

const FAMILY_MAP: Record<ThemeFamily, string> = {
  primary: "primary",
  neutral: "neutral",
  success: "success",
  error: "error",
  warn: "warning",
  info: "info",
};

const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

// Accepts #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() and hsl()/hsla().
const COLOUR = /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|hsl)a?\([^)]*\))$/i;

const isColour = (value: unknown) => typeof value === "string" && COLOUR.test(value.trim());

/**
 * A family is usable only if every step is present and parseable.
 * @returns {Record<string,string>|null} trimmed scale, or null to fall back.
 */
const validateScale = (scale: unknown): Record<string, string> | null => {
  if (!scale || typeof scale !== "object") return null;

  const clean: Record<string, string> = {};
  for (const step of STEPS) {
    const value = (scale as Record<string, unknown>)[step];
    if (!isColour(value)) return null;
    clean[step] = String(value).trim();
  }
  return clean;
};

/**
 * @param {object} data      `data` object from /api/theme (module id -> theme entry)
 * @param {string|number} [moduleId]  currently active module id; falls back
 *        to the default-flagged module when omitted or not found in `data`.
 * @returns {{applied: string[], fellBack: string[]}} which families came from
 *          the API and which kept their local Figma values.
 */
export const applyTheme = (data: ThemePayload | null | undefined, moduleId?: Id | null): { applied: string[]; fellBack: string[] } => {
  const applied: string[] = [];
  const fellBack: string[] = [];

  if (typeof document === "undefined") return { applied, fellBack };

  // No payload at all — every family keeps its local shades.
  if (!data || typeof data !== "object") {
    return { applied, fellBack: Object.keys(FAMILY_MAP) };
  }

  const entries = Object.values(data);
  const defaultEntry = entries.find((entry) => entry?.module_is_default) ?? entries[0];
  const moduleEntry =
    entries.find((entry) => String(entry?.module_id) === String(moduleId)) ?? defaultEntry;

  if (!moduleEntry) {
    return { applied, fellBack: Object.keys(FAMILY_MAP) };
  }

  const root = document.documentElement;

  for (const [apiFamily, cssFamily] of Object.entries(FAMILY_MAP)) {
    // Module-specific colour (primary/neutral) first; the default module
    // covers families a non-default module doesn't carry (success/error/warn/info).
    const scale =
      validateScale((moduleEntry as Record<string, unknown>)[apiFamily]) ?? validateScale((defaultEntry as Record<string, unknown> | undefined)?.[apiFamily]);

    if (!scale) {
      fellBack.push(apiFamily);
      
      STEPS.forEach((step) => root.style.removeProperty(`--color-${cssFamily}-${step}`));
      continue;
    }

    STEPS.forEach((step) => {
      root.style.setProperty(`--color-${cssFamily}-${step}`, scale[step]);
    });
    applied.push(apiFamily);
  }

  return { applied, fellBack };
};

// The main shade of one module's own palette, for showing a module in its own
// colour while a different module's theme is active. Falls back to the seed the
// scale was generated from.
export const getModulePrimary = (data: ThemePayload | null | undefined, moduleId: Id | null | undefined): string | null => {
  const entry = Object.values(data || {}).find(
    (item) => String(item?.module_id) === String(moduleId)
  );
  return entry?.primary?.["500"] || entry?.seed_primary || null;
};

export default applyTheme;
