"use client";

import { useCallback } from "react";

const ZOOM = 1.04;
const LADDER_DURATION_MS = 190;

// The play capsule's spring (cubic-bezier(0.34,1.56,0.64,1)) sampled at ~6
// discrete sizes, overshoot-and-settle included: rest 1 → climb → ignite 1.052
// → settle 1.04. Each segment uses `steps(1,end)` so the scale HOLDS then
// JUMPS — the element only ever re-rasterizes at these fixed sizes. No
// fractional-scale glyph blur, yet the hover visibly springs.
const ENTER_STEPS = ["1", "1.02", "1.035", "1.048", "1.052", String(ZOOM)];
const EXIT_STEPS = [...ENTER_STEPS].reverse();

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function supportsHover(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover)").matches;
}

function cancelAnimations(node: HTMLElement): void {
  node.getAnimations().forEach((animation) => animation.cancel());
}

function currentScale(node: HTMLElement): string {
  const value = getComputedStyle(node).scale;
  if (!value || value === "none" || !Number.isFinite(Number(value))) {
    return "1";
  }
  return value;
}

function ladderKeyframes(steps: readonly string[]): Keyframe[] {
  return steps.map((scale, i) =>
    i === 0
      ? { scale }
      : { scale, easing: "steps(1, end)" }
  );
}

/**
 * Dense spring-shaped hover ladder for TEXT controls: ~6 crisp `steps(1,end)`
 * hops sampling the play capsule's spring silhouette (climb → overshoot 1.052 →
 * settle 1.04) over ~190ms. Every hop holds then jumps, so the element only
 * ever re-rasterizes at fixed sizes — visible spring motion with zero
 * fractional-scale glyph blur. Rest is natural (scale 1, no squeezing);
 * hover-out plays the same ladder reversed. `fill: "forwards"` holds each end
 * state while the pointer is over the control.
 *
 * Scales the independent `scale` property (never `transform`), so it composes
 * with `paint()`'s per-frame transform on the dial and `usePressBounce`'s
 * translate on the same node. Skipped under reduced motion and on non-hover
 * (touch) surfaces — the media-scoped CSS fallbacks handle those. Returns a
 * cleanup-bearing ref callback like `usePressBounce`.
 */
export function useHoverSteps() {
  return useCallback((node: HTMLElement | null) => {
    if (!node) return;

    if (prefersReducedMotion() || !supportsHover()) return;

    const onEnter = () => {
      cancelAnimations(node);
      node.animate(
        ladderKeyframes([currentScale(node), ...ENTER_STEPS.slice(1)]),
        { duration: LADDER_DURATION_MS, easing: "linear", fill: "forwards" }
      );
    };

    const onLeave = () => {
      cancelAnimations(node);
      node.animate(ladderKeyframes(EXIT_STEPS), {
        duration: LADDER_DURATION_MS,
        easing: "linear",
        fill: "forwards",
      });
    };

    node.addEventListener("pointerenter", onEnter);
    node.addEventListener("pointerleave", onLeave);

    return () => {
      node.removeEventListener("pointerenter", onEnter);
      node.removeEventListener("pointerleave", onLeave);
      cancelAnimations(node);
    };
  }, []);
}