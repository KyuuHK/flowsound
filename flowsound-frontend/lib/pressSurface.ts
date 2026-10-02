/**
 * One shared hover language for every pressable, replacing the scattered
 * lift/translate/scale variants that existed per component.
 *
 * Hover lives in CSS (Tailwind v4's independent `scale` property, so it
 * composes with — never fights — `usePressBounce`'s WAAPI `transform` and the
 * dial's imperative per-frame `style.transform`), media-scoped to
 * `(hover:hover)` so touch never sticks:
 *   - `hoverZoomClass` — springy scale (icon-only controls; smooth shapes
 *     tolerate the interpolated zoom).
 *   - `hoverZoomCrispClass` — the sharp companion for TEXT controls. No CSS
 *     `hover:scale` at all: `useHoverSteps` owns the zoom as a dense
 *     `steps(1,end)` ladder (~6 hops sampling the play spring's silhouette,
 *     overshoot 1.052 → settle 1.04). Each hop holds then jumps, so the element
 *     only ever re-rasterizes at fixed sizes — visible spring motion, zero
 *     fractional-scale glyph blur. (The pre-scaled-raster trick — resting at
 *     `1/1.04` and springing to 1 — was tried and REJECTED in practice:
 *     Chromium re-rasterizes at fractional scales without a resident layer,
 *     so the blur returned AND the forced -4% rest read as squished.) This
 *     class only eases shadow/color/filter with `--ease-spring`.
 *
 * PRESS is not CSS: a `:active` squish cannot overshoot, and the bounciness
 * comes from the release overshoot. Every pressable uses `usePressBounce`'s
 * WAAPI spring (scale plane for icons, translate plane for text so glyphs stay
 * sharp, label-level on the dial so it never fights `paint()`'s transform).
 *
 * The transition list deliberately excludes `transform`: the dial's imperative
 * `paint()` rewrites `style.transform` every frame, and `usePressBounce`
 * animates it via WAAPI — neither may be CSS-transitioned.
 * Reduced motion flattens hover/press via `motion-reduce:` + the WAAPI guard.
 */

const pressTransition =
  "transition-[scale,translate,color,background-color,box-shadow,filter] duration-200 ease-[var(--ease-spring)]";

const crispTransition =
  "transition-[color,background-color,box-shadow,filter] duration-200 ease-[var(--ease-spring)]";

export const hoverZoomClass = `${pressTransition} [@media(hover:hover)]:hover:scale-[1.04] motion-reduce:transition-none motion-reduce:hover:scale-100`;

export const hoverZoomCrispClass = `${crispTransition} motion-reduce:transition-none`;