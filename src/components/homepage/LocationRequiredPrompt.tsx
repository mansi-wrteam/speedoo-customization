import React from "react";
import { useDispatch } from "react-redux";
import { LuMapPin } from "react-icons/lu";
import { setLocationModalOpen } from "@/redux/slices/uiSlice";
import { t } from "@/utils/translation";
import type { AppDispatch } from "@/redux/hooks";

/**
 * Home with no location yet (WEB_PARITY_V4.0.2 §8).
 *
 * Product calls need latitude and longitude — the server rejects a blank
 * latitude — so with no pin placed this used to surface as an error. Asking
 * for the one thing that would fix it is the whole change.
 */
const LocationRequiredPrompt = () => {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <section className="container">
      <div className="mx-auto flex min-h-[420px] max-w-md flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-background-subtle)] text-[var(--brand-foreground-default)]">
          <LuMapPin size={30} />
        </span>
        <h2 className="text-xl font-bold text-[var(--foreground-primary)]">
          {t("set_your_location")}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--foreground-tertiary)]">
          {t("set_your_location_description")}
        </p>
        <button
          type="button"
          onClick={() => dispatch(setLocationModalOpen(true))}
          className="rounded-lg bg-[var(--button-primary-background-default)] px-5 py-2.5 text-base font-medium text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
        >
          {t("set_location")}
        </button>
      </div>
    </section>
  );
};

export default LocationRequiredPrompt;
