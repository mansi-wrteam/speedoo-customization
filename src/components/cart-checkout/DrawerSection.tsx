import React from "react";
import { cn } from "@/lib/utils";

export interface DrawerSectionProps {
  /** Uppercase section heading. Omit for an unlabelled block. */
  title?: React.ReactNode;
  /** Small brand-tinted glyph before the heading. */
  icon?: React.ReactNode;
  /** Right end of the heading row (a count, a link). */
  trailing?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * One block of the cart + checkout drawer.
 *
 * The drawer is a single scrolling column at 440px, so every section shares the
 * same heading treatment and spacing — 13.5/800 uppercase, brand-tinted icon,
 * 22px between sections.
 */
const DrawerSection = ({ title, icon, trailing, className, children }: DrawerSectionProps) => (
  <section className={cn("mb-5 last:mb-0", className)}>
    {(title || trailing) && (
      <div className="mb-3 flex items-center gap-2">
        {icon && (
          <span className="flex flex-shrink-0 text-[var(--brand-foreground-default)]">{icon}</span>
        )}
        {title && (
          <h3 className="flex-1 text-[13.5px] font-extrabold uppercase tracking-wide text-[var(--foreground-secondary)]">
            {title}
          </h3>
        )}
        {trailing && <div className="flex flex-shrink-0 items-center">{trailing}</div>}
      </div>
    )}
    {children}
  </section>
);

export default DrawerSection;
