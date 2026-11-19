import React from "react";
import { FiCheck } from "react-icons/fi";

export interface KigenCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  name?: string;
}

export type KigenRadioProps = KigenCheckboxProps;

// 24px checkbox drawn from the Kigen checkbox tokens — the native control can't
// render the 2px outline + brand fill the design calls for. The real input stays
// in the tree (transparent, on top) so keyboard and screen readers still work.
export const KigenCheckbox = ({ checked, disabled, onChange, name }: KigenCheckboxProps) => (
  <span className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
    <input
      type="checkbox"
      name={name}
      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
    <span
      className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-sm outline outline-2 -outline-offset-2 ${
        checked
          ? "bg-[var(--checkbox-checked-background)] outline-[var(--checkbox-checked-border)]"
          : "bg-[var(--checkbox-unchecked-background)] outline-[var(--checkbox-unchecked-border)]"
      }`}
    >
      {checked && (
        <FiCheck
          size={14}
          strokeWidth={3}
          className="text-[var(--checkbox-checked-icon)]"
        />
      )}
    </span>
  </span>
);

// 22px radio: 2px ring, brand-filled 16px dot when selected.
export const KigenRadio = ({ checked, disabled, onChange, name }: KigenRadioProps) => (
  <span className="relative flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center">
    <input
      type="radio"
      name={name}
      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
    <span
      className={`pointer-events-none flex h-[22px] w-[22px] items-center justify-center rounded-full p-[3px] outline outline-2 -outline-offset-2 ${
        checked
          ? "outline-[var(--radio-selected-border)]"
          : "outline-[var(--radio-unselected-border)]"
      }`}
    >
      {checked && (
        <span className="h-4 w-4 rounded-full bg-[var(--radio-selected-background)]" />
      )}
    </span>
  </span>
);
