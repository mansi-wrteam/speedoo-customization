import React from "react";
import { t } from "@/utils/translation";

export interface ModuleSwitchProgressProps {
  active: boolean;
}

/**
 * Thin indeterminate bar pinned to the top of the viewport while Home loads a
 * module that wasn't prefetched. Says "working" without blanking the page.
 */
const ModuleSwitchProgress = ({ active }: ModuleSwitchProgressProps) => (
  <div
    role="progressbar"
    aria-hidden={!active}
    aria-label={t("loading")}
    className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200 ${
      active ? "opacity-100" : "opacity-0"
    }`}
  >
    {active ? <div className="module-switch-progress h-full w-1/3 bg-[var(--brand-background-default)]" /> : null}
  </div>
);

export default ModuleSwitchProgress;
