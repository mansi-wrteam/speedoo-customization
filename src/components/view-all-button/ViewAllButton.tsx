"use client";
import React from "react";
import { useSelector } from "react-redux";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { LocalizedLink } from "@/utils/localizedNav";
import { t } from "@/utils/translation";
import type { RootState } from "@/types/state";

export interface ViewAllButtonProps {
  /** Renders a LocalizedLink instead of a button. */
  href?: string;
  /** Button mode only. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Defaults to the see_all translation. */
  label?: string;
  className?: string;
}

/**
 * ViewAllButton — section header "View All" action with trailing arrow.
 *
 * Renders a LocalizedLink when `href` is given, otherwise a button.
 * The arrow points back in RTL so it always reads as "forward".
 *
 * Props:
 *  - href     : optional route; renders a link instead of a button
 *  - onClick  : click handler (button mode)
 *  - label    : override text (defaults to the see_all translation)
 */
const ViewAllButton = ({ href, onClick, label, className = "" }: ViewAllButtonProps) => {
  const language = useSelector((state: RootState) => state.Language?.selectedLanguage);
  const rtl = language?.type === "RTL";
  const Arrow = rtl ? IoArrowBack : IoArrowForward;

  const content = (
    <>
      <span className="text-nowrap">{label ?? t("see_all")}</span>
      <span className="size-6 flex items-center justify-center shrink-0">
        <Arrow size={16} />
      </span>
    </>
  );

  const classes = `p-2 inline-flex justify-center items-center gap-1 text-base font-medium leading-6 text-[var(--brand-foreground-on-brand)] hover:text-[var(--brand-foreground-default)] transition-colors ${className}`;

  if (href) {
    return (
      <LocalizedLink href={href} className={classes}>
        {content}
      </LocalizedLink>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
};

export default ViewAllButton;
