import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RiStore2Line } from "react-icons/ri";
import { t } from "@/utils/translation";

export interface GuestCartConflictModalProps {
  open: boolean;
  /** How many signed-out lines are waiting on the answer. */
  count: number;
  busy?: boolean;
  /** `true` replaces the account cart with those lines, `false` drops them. */
  onAnswer: (replace: boolean) => void;
}

/**
 * "Your cart holds one seller at a time" (WEB_PARITY_V4.0.2 §1.8).
 *
 * Asked once, after sign-in, when the account cart refuses the device cart's
 * lines because they belong to a different seller. Both answers lose
 * something, so the copy says what each one costs.
 */
const GuestCartConflictModal = ({ open, count, busy = false, onAnswer }: GuestCartConflictModalProps) => (
  <Dialog open={open}>
    <DialogContent className="flex w-[420px] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-2xl p-0">
      <div className="flex flex-col items-center gap-3 px-6 pt-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-background-subtle)] text-[var(--brand-foreground-default)]">
          <RiStore2Line size={22} />
        </span>
        <DialogTitle className="text-[17px] font-extrabold text-[var(--foreground-primary)]">
          {t("different_seller_title")}
        </DialogTitle>
        <p className="text-[13.5px] leading-relaxed text-[var(--foreground-secondary)]">
          {t("different_seller_message")}
        </p>
        {count > 0 && (
          <p className="text-xs font-semibold text-[var(--foreground-tertiary)]">
            {`${count} ${count === 1 ? t("item") : t("items").toLowerCase()}`}
          </p>
        )}
      </div>

      <div className="flex gap-3 p-6">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAnswer(false)}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-[var(--button-outline-foreground-default)] outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] disabled:opacity-60"
        >
          {t("no")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAnswer(true)}
          className="flex-1 rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2.5 text-sm font-bold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:opacity-60"
        >
          {t("yes")}
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

export default GuestCartConflictModal;
