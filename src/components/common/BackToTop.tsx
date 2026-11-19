import React, { useEffect, useRef, useState } from "react";
import { MdArrowUpward } from "react-icons/md";
import { t } from "@/utils/translation";

/** Past this much scroll the button can show (§8). */
const SHOW_AFTER_PX = 400;
/** Ignore scroll jitter smaller than this when reading direction. */
const DIRECTION_SLACK_PX = 8;
const SCROLL_DURATION_MS = 400;

/** Progress ring geometry, in the 48x48 viewBox. */
const RING_RADIUS = 22;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** The spec's ease-out-cubic, so the scroll decelerates into the top. */
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

/**
 * "Back to top" (WEB_PARITY_V4.0.2 §8). Shows only while the user scrolls back
 * up past 400 px, which is when they are looking for the top, and hides again
 * on scroll down. Sits bottom-right, above the mobile bottom nav. A brand ring
 * round the button fills with page progress; from md up the label slides out
 * on hover. The header isn't sticky, so a top-anchored pill floated over
 * banners and products.
 */
const BackToTop = () => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(y / max, 1) : 0);
        const delta = y - lastY.current;
        if (Math.abs(delta) < DIRECTION_SLACK_PX) return;
        setVisible(y > SHOW_AFTER_PX && delta < 0);
        lastY.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const scrollToTop = () => {
    // Animated by hand rather than `behavior: "smooth"`, which has no duration
    // or easing control and is ignored under prefers-reduced-motion.
    const start = window.scrollY;
    const startedAt = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / SCROLL_DURATION_MS, 1);
      window.scrollTo(0, Math.round(start * (1 - easeOutCubic(progress))));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={t("back_to_top")}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`group fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 items-center rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-default)_80%,transparent)] text-[var(--foreground-primary)] shadow-overlay backdrop-blur-md transition-[opacity,transform,background-color,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-[var(--surface-inverse)] hover:text-[var(--foreground-inverse)] active:scale-95 md:bottom-8 md:right-8 ${
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-75 opacity-0"
      }`}
    >
      <span className="relative grid size-12 shrink-0 place-items-center">
        <svg viewBox="0 0 48 48" aria-hidden className="absolute inset-0 -rotate-90">
          <circle cx="24" cy="24" r={RING_RADIUS} fill="none" strokeWidth="2.5" className="stroke-[var(--border-subtle)] transition-opacity duration-300 group-hover:opacity-0" />
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
            className="stroke-[var(--brand-border-default)] transition-[stroke-dashoffset,opacity] duration-150 group-hover:opacity-0 group-hover:duration-500"
          />
          {/* On hover a white ring draws itself all the way round over the
              fading progress ring, so hover shows an outline, not progress.
              The CSS dashoffset overrides the attribute while hovered. */}
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH}
            className="stroke-[var(--foreground-inverse)] transition-[stroke-dashoffset] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:[stroke-dashoffset:0]"
          />
        </svg>
        <MdArrowUpward size={20} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
      </span>
      {/* Label slides out of the circle on hover or keyboard focus, desktop only. */}
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 md:inline-block md:group-hover:max-w-32 md:group-hover:pr-5 md:group-hover:opacity-100 md:group-focus-visible:max-w-32 md:group-focus-visible:pr-5 md:group-focus-visible:opacity-100">
        {t("back_to_top")}
      </span>
    </button>
  );
};

export default BackToTop;
