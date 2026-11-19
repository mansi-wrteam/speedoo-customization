import React from 'react';
import { isRtl } from "@/lib/utils";

export interface LoaderProps {
  background?: string;
  height?: number | string;
  width?: number | string;
  /** "full" renders a fixed full-screen overlay. */
  screen?: "full";
}

const Loader = ({ background, height, width, screen }: LoaderProps) => {
  const rtl = isRtl();
  const outerAnimation = rtl ? "animate-reverseRotation" : "animate-rotation";
  const innerAnimation = rtl ? "animate-rotation" : "animate-reverseRotation";
  return (
    <>
      {screen !== undefined && screen === 'full' ? (
        <div
          className={`  fixed inset-0 flex items-center justify-center z-[999] ${background === 'none' ? '' : ''
            }`}
        >
          <div
            className="flex items-center justify-center p-5 w-24 h-24 rounded-md"
            style={{
              // Tailwind's opacity modifier doesn't reliably combine with a
              // var()-based color (that's what made the old bg-[var(...)]/80
              // silently fail to render) — color-mix() blends it at the CSS
              // level instead, so the tint always shows.
              backgroundColor:
                "color-mix(in srgb, var(--brand-background-default) 50%, black 20%)",
            }}
          >
            <div className="relative w-12 h-12">
              {/* Outer rotating ring */}
              <span className={`absolute inset-0 w-full h-full border-t-4 border-r-4 border-t-[var(--color-neutral-50)] border-r-[var(--color-neutral-50)] rounded-full ${outerAnimation}`}></span>
              {/* Inner counter-rotating ring */}
              <span className={`absolute inset-0 w-8 h-8 border-l-4 border-b-4 border-l-white/60 border-b-white/60 rounded-full ${innerAnimation} top-2 ${rtl ? "right-2" : "left-2"}`}></span>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`flex items-center justify-center ${background ? '' : 'bg-[var(--surface-subtle)]'
            }`}
          style={{
            width: width,
            height: height,
            background: background || 'transparent',
          }}
        >
          <div
            className="flex items-center justify-center p-5 w-24 h-24 rounded-md"
            style={{
              // Tailwind's opacity modifier doesn't reliably combine with a
              // var()-based color (that's what made the old bg-[var(...)]/80
              // silently fail to render) — color-mix() blends it at the CSS
              // level instead, so the tint always shows.
              backgroundColor:
                "color-mix(in srgb, var(--brand-background-default) 70%, black 20%)",
            }}
          >
            <div className="relative w-12 h-12">
              {/* Outer rotating ring (white) */}
              <span className={`absolute inset-0 w-full h-full border-t-4 border-r-4 border-t-[var(--color-neutral-50)] border-r-[var(--color-neutral-50)] rounded-full ${outerAnimation}`}></span>

              {/* Inner counter-rotating ring (black) */}
              <span className={`absolute inset-0 w-8 h-8 border-l-4 border-b-4 border-l-white/60 border-b-white/60 rounded-full ${innerAnimation} top-2 ${rtl ? "right-2" : "left-2" }`}></span>
            </div>
          </div>

        </div>
      )}
    </>
  );
};

export default Loader;
