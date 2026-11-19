import React from "react";
import { MdOutlineDescription } from "react-icons/md";
import { t } from "@/utils/translation";

// Shared empty state for the static info/policy pages (Terms, Privacy, Shipping,
// Return, Cancellation, About, Contact, FAQs) when the API returns no content.
// `title` is the page name; `message` is an optional override.
export interface NoInfoDataProps {
  title?: string;
  message?: string;
}

const NoInfoData = ({ title, message }: NoInfoDataProps) => (
  <div className="container my-5 px-1 md:px-0">
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-[var(--surface-subtle)] px-6 py-16 text-center">
      <MdOutlineDescription size={64} className="text-[var(--foreground-tertiary)]" />
      {title && <h2 className="font-bold text-xl">{title}</h2>}
      <p className="text-sm text-[var(--foreground-secondary)]">{message || t("no_data_found")}</p>
    </div>
  </div>
);

export default NoInfoData;
