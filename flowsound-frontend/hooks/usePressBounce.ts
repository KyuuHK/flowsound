"use client";

import { useCallback } from "react";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type BouncePlane = "scale" | "translate";

interface BounceOptions {
  plane?: BouncePlane;
  /** Value moved away from rest on pointerdown (scale factor, or px for translate). */
  start: number;
  /** Overshoot value the spring overshoots on release before settling. */
  peak?: number;
  duration?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const fromValue = (plane: BouncePlane, value: number) =>
  plane === "scale" ? `scale(${value})` : `translateY(${value}px)`;

const restValue = (plane: BouncePlane) =>
  plane === "scale" ? "scale(1)" : "translateY(0px)";

/**
 * Apple-style press-then-bounce for round controls.
 *
 * Two motion planes:
 * - "scale"   : squishes on press, springs back with a slight overshoot.
 *   Best for icon-only controls (text gets re-rasterized at fractional
 *   sizes, so scaling text-bearing controls looks briefly soft).
 * - "translate": dips down 1px on press, springs past rest on release.
 *   Pure translation never re-rasterizes glyphs, so text stays sharp.
 *
 * On pointerdown the control moves to `start`; on release (anywhere, tracked
 * on the window) it springs via the Web Animations API. No dependency,
 * respects prefers-reduced-motion.
 */
export function usePressBounce(
  options: number | BounceOptions = { plane: "scale", start: 0.88 }
) {
  const { plane, start, peak, duration } =
    typeof options === "number"
      ? { plane: "scale" as const, start: options, peak: 1.02, duration: 340 }
      : {
          plane: options.plane ?? ("scale" as const),
          start: options.start,
          peak: options.peak ?? (options.plane === "translate" ? -1.5 : 1.02),
          duration: options.duration ?? (options.plane === "translate" ? 320 : 340),
        };

  return useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;

      let pressed = false;

      const onDown = () => {
        if (prefersReducedMotion()) return;
        pressed = true;
        node.getAnimations().forEach((animation) => animation.cancel());
        node.style.transform = fromValue(plane, start);
        window.addEventListener("pointerup", onUp, { once: true });
      };

      const onUp = () => {
        if (!pressed) return;
        pressed = false;
        if (prefersReducedMotion()) {
          node.style.transform = "";
          return;
        }
        node.animate(
          [
            { transform: fromValue(plane, start) },
            { transform: fromValue(plane, peak), offset: 0.55 },
            { transform: restValue(plane) },
          ],
          { duration, easing: SPRING }
        );
        node.style.transform = "";
      };

      node.addEventListener("pointerdown", onDown);

      return () => {
        node.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
      };
    },
    [plane, start, peak, duration]
  );
}