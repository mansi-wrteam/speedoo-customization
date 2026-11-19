import React from "react";

export interface ModuleButtonProps {
  label?: string;
  /** Inline SVG / icon node; use fill="currentColor" so colour follows state. */
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Hover/press intent — the header uses it to prefetch the module's Home. */
  onIntent?: () => void;
  className?: string;
  size?: "md" | "sm";
}

/**
 * ModuleButton — toggle pill for app modules (e.g. Groceries / Pharmacy).
 *
 * Props:
 *  - label    : button text
 *  - icon     : React node (svg/icon). Use fill="currentColor" so color follows state.
 *  - isActive : active state styling
 *  - onClick  : click handler
 *  - size     : "md" (default, desktop pill row) | "sm" (compact, mobile row)
 */
const ModuleButton = ({ label, icon, isActive = false, onClick, onIntent, className = "", size = "md" }: ModuleButtonProps) => {
  const isSm = size === "sm";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onIntent}
      onFocus={onIntent}
      onPointerDown={onIntent}
      className={`group ${isSm ? "px-2.5 py-1.5 gap-1.5" : "px-3 py-2 gap-2"} rounded-lg inline-flex justify-center items-center transition-colors cursor-pointer ${
        isActive
          ? "bg-[var(--brand-background-default)] text-[var(--foreground-inverse)]"
          : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--foreground-tertiary)] hover:bg-[var(--brand-background-default)] hover:text-[var(--foreground-inverse)] hover:border-transparent"
      } ${className}`}
    >
      <span
        className={`${isSm ? "size-6" : "size-8"} relative flex items-center justify-center transition-colors ${
          isActive
            ? "text-[var(--foreground-inverse)]"
            : "text-[var(--brand-background-default)] group-hover:text-[var(--foreground-inverse)]"
        }`}
      >
        {/* Inline SVGs and masked icons follow currentColor. A raw <img>
            (the fallback when a remote icon can't be read) can't be recoloured,
            so it still gets forced white on the active/hover pill. */}
        <span
          className={`${isSm ? "size-4 [&_svg]:size-4" : "size-6 [&_svg]:size-6"} flex items-center justify-center [&_svg]:fill-current [&_svg_*]:fill-current [&_img]:transition-[filter] ${
            isActive
              ? "[&_img]:brightness-0 [&_img]:invert"
              : "group-hover:[&_img]:brightness-0 group-hover:[&_img]:invert"
          }`}
        >
          {icon}
        </span>
      </span>
      <span className={`${isSm ? "text-sm" : "text-base"} font-bold leading-5`}>{label}</span>
    </button>
  );
};

export default ModuleButton;