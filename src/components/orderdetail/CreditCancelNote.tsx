import React from "react";
import { t } from "@/utils/translation";

const CreditCancelNote = () => (
  <p className="self-stretch rounded-lg bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground-secondary)]">
    {t("credit_cancel_note")}
  </p>
);

export default CreditCancelNote;
