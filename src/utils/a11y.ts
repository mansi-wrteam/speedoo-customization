import type { KeyboardEvent } from "react";

/**
 * Spread on a clickable div/span/li/p that can't simply become a <button>
 * (it wraps block content or sits in a list): makes it reachable with Tab
 * and lets Enter/Space fire its existing onClick.
 *
 *   <div {...pressable} onClick={open}>…</div>
 */
export const pressable = {
  role: "button",
  tabIndex: 0,
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
    // Keys pressed inside a nested input/button are theirs, not ours.
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  },
} as const;
