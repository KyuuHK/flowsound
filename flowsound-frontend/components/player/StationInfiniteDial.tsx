"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useHoverSteps } from "@/hooks/useHoverSteps";
import { usePressBounce } from "@/hooks/usePressBounce";
import { hoverZoomCrispClass } from "@/lib/pressSurface";
import { cn } from "@/lib/utils";

export interface StationItem {
  readonly id: string;
  readonly name: string;
}

interface StationInfiniteDialProps {
  readonly stations: readonly StationItem[];
  readonly activeStationIndex: number;
  readonly onSelectStation: (index: number) => void;
  readonly className?: string;
}

// Slide distance, in pixels, per one-station step of the continuous position.
const STEP_PX = 112;
const SLOT_OFFSETS: readonly number[] = [-2, -1, 0, 1, 2] as const;

// --- Dial settle physics (tune / revert here) -------------------------------
const SETTLE_PHYSICS = {
  stiffness: 130, // spring pull toward the target (stations/s^2) — slow, soft settle
  dampingRatio: 0.44, // < 1 → bouncy overshoot as the strip comes to a stop
  magnetRadius: 0.45, // capture window (stations) where the magnet pulls in
  magnetStrength: 60, // extra stations/s^2 injected near the target
} as const;
const FLING_TRAVEL_MS = 320; // release velocity × this = expected roll-out
const FLING_REF_VELOCITY = 0.4; // px/ms — at/below this the roll-out stays linear (today's feel)
const FLING_CURVE_TOP = 0.9; // px/ms — a normal swipe already reaches ~full travel (saturates)
const FLING_MAX_STATIONS = 1.25; // universal roll-out cap — the dial only ever glides one slot
const SEED_TRAVEL_S = 0.8; // reference cruise time used to seed the spring (slow, lazy cruise)
const FLING_IDLE_DECAY_MS = 450; // velocity decays this fast (exp) while the pointer holds still
const IDLE_KILL_MS = 400; // a stationary hold longer than this cancels ALL momentum at release
const IDLE_RESET_PX = 2; // a pointermove only counts as motion above this — micro-jitter
const VEL_EMA_ALPHA = 0.5; // velocity smoothing (stability of the fling)
const MAX_FRAME_MS = 32; // clamped rAF delta so the feel matches any refresh rate

const focusRingClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]";

const centerElevation =
  "shadow-[0_4px_14px_-2px_rgba(120,110,80,0.22),0_1px_3px_rgba(120,110,80,0.12),inset_0_1px_1px_rgba(255,255,255,1)]";

// Base pill classes (shared by every slot). Center styling and the literal
// label are applied imperatively by paint() so per-frame updates never touch
// the React reconciliation path. The hover zoom lives on the independent
// `scale` property, so paint()'s per-frame `style.transform` composes on top.
// Crisp variant: the pills carry text, so the zoom is not a CSS hover scale —
// `useHoverSteps` owns it as a dense `steps(1,end)` ladder (~6 hops sampling
// the play spring's silhouette, overshoot 1.052 → settle 1.04): each hop lands
// at an exact fixed size, so the label never re-rasterizes mid-motion. Press
// bounce is also WAAPI on that inner label span (translate plane), never the
// button — paint() owns it.
const pillBaseClass =
  "absolute top-1/2 left-1/2 flex min-h-[40px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-xs font-semibold " +
  hoverZoomCrispClass;

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Infinite rotary station dial (carousel.md, paper re-skin): the strip is a
 * continuous position in station units — grab it with the pointer and it tracks
 * the cursor 1:1, wraps endlessly via modulo (no dead ends), and settles on the
 * nearest station with an under-damped spring: release momentum rolls it out,
 * a magnet pulls it onto the slot, and it bounces softly to a stop. Pills are
 * keyed by slot, so nothing remounts as station labels cross slot boundaries.
 * Reduced motion keeps 1:1 drag but snaps instantly.
 *
 * Perf: the animated transform/opacity and the centered-pill styling are
 * written straight to the DOM each frame (paint()). React only re-renders on
 * external changes; the layout effect re-applies paint() after every render so
 * the two never disagree. Physics above is the ONLY thing that defines the
 * feel — these rendering changes move the same numbers, imperatively.
 */
export function StationInfiniteDial({
  stations,
  activeStationIndex,
  onSelectStation,
  className,
}: StationInfiniteDialProps) {
  const prefersReducedMotion = useReducedMotion();
  const totalStationCount = stations.length;
  // Label-level press bounce (translate plane): never touches the button's
  // transform, which paint() owns, and never scales text (stays sharp).
  const pillBounceRef = usePressBounce({ plane: "translate", start: 1, peak: -1.5 });
  const pillHoverRef = useHoverSteps();

  // Compose the label's press bounce and two-tap hover on one ref.
  const composeLabelRef = (el: HTMLSpanElement | null) => {
    if (el) {
      const cleanupBounce = pillBounceRef(el);
      const cleanupZoom = pillHoverRef(el);
      return () => {
        cleanupBounce?.();
        cleanupZoom?.();
      };
    }
  };

  const posRef = useRef<number>(mod(activeStationIndex, totalStationCount || 1));
  const snapRafRef = useRef<number | null>(null);
  const flushRafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<number>(0);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pillStationRefs = useRef<number[]>([]);
  const renderedRoundRef = useRef<number>(Number.NaN);
  const paintedStationsRef = useRef<readonly StationItem[] | null>(null);
  const dragRef = useRef<{
    startX: number;
    grabPos: number;
    lastX: number;
    lastT: number;
    vel: number;
    moved: boolean;
  } | null>(null);
  const gestureMovedRef = useRef(false);
  const lastCommittedRef = useRef(mod(activeStationIndex, totalStationCount || 1));

  const cancelSnap = () => {
    if (snapRafRef.current !== null) {
      cancelAnimationFrame(snapRafRef.current);
      snapRafRef.current = null;
    }
    if (flushRafRef.current !== null) {
      cancelAnimationFrame(flushRafRef.current);
      flushRafRef.current = null;
    }
  };

  // Imperative per-frame paint: mirrors exactly what the old per-frame React
  // render computed — same math, same output — but writes styles/text directly
  // so the continuous animation never pays React reconciliation.
  const paint = (value: number, st: readonly StationItem[]) => {
    const count = st.length;
    if (count === 0) return;
    const round = Math.round(value);
    const changed = round !== renderedRoundRef.current || paintedStationsRef.current !== st;
    if (changed) {
      paintedStationsRef.current = st;
      for (let slot = 0; slot < SLOT_OFFSETS.length; slot += 1) {
        pillStationRefs.current[slot] = mod(round + SLOT_OFFSETS[slot], count);
      }
    }
    for (let slot = 0; slot < SLOT_OFFSETS.length; slot += 1) {
      const node = pillRefs.current[slot];
      if (!node) continue;
      const rawIndex = round + SLOT_OFFSETS[slot];
      const distance = Math.abs(value - rawIndex);
      const isCenter = distance < 0.5;
      if (changed) {
        const station = st[pillStationRefs.current[slot]];
        const label = node.firstElementChild;
        if (label && station && label.textContent !== station.name) {
          label.textContent = station.name;
        }
        node.setAttribute("aria-checked", isCenter ? "true" : "false");
        node.classList.toggle("bg-white", isCenter);
        node.classList.toggle("text-ink", isCenter);
        node.classList.toggle("ring-ink/10", isCenter);
        node.classList.toggle(centerElevation, isCenter);
        node.classList.toggle("bg-transparent", !isCenter);
        node.classList.toggle("text-ink-faint", !isCenter);
        node.classList.toggle("ring-transparent", !isCenter);
      }
      node.style.zIndex = isCenter ? "10" : "0";
      const scale = isCenter ? 1.05 : 0.92;
      const opacity = isCenter
        ? 1
        : Math.max(0.3, Math.min(0.9, 0.9 - (distance - 0.5) * 0.28));
      const x = (value - rawIndex) * STEP_PX;
      node.style.transform = `translate(-50%, -50%) translateX(${x}px) scale(${scale.toFixed(3)})`;
      node.style.opacity = opacity.toFixed(3);
    }
    renderedRoundRef.current = round;
  };

  // After EVERY React render (mount, station list refresh, any parent change)
  // re-apply the imperative visuals so React-owned children never desync.
  useLayoutEffect(() => {
    paint(posRef.current, stations);
  });

  const commit = (index: number, stationsLength: number) => {
    if (stationsLength === 0) return;
    const normalized = mod(index, stationsLength);
    if (normalized !== lastCommittedRef.current) {
      lastCommittedRef.current = normalized;
      onSelectStation(normalized);
    }
  };

  const settleAt = (target: number, seedVelocity = 0) => {
    cancelSnap();
    const to = mod(Math.round(target), totalStationCount || 1);
    if (prefersReducedMotion) {
      posRef.current = to;
      paint(to, stations);
      commit(to, totalStationCount);
      return;
    }
    const naturalOmega = Math.sqrt(SETTLE_PHYSICS.stiffness);
    let position = posRef.current;
    // Route the spring through the NEAREST congruent copy of the target. The raw
    // position can sit anywhere (near the wrap seam a target of `0` is just as
    // close as `10`); without this, a small fling near the seam made the spring
    // integrate the full arc across every station at high speed — the "crazy
    // fast" fling that still landed roughly where you let go.
    const span = totalStationCount || 1;
    const settleTarget = to + span * Math.round((position - to) / span);
    let velocity = seedVelocity;
    let last: number | null = null;
    const step = (rAfTime: number) => {
      if (last === null) last = rAfTime;
      const dt = Math.min(MAX_FRAME_MS, rAfTime - last) / 1000;
      last = rAfTime;
      const offset = settleTarget - position;
      const distanceToTarget = Math.abs(offset);
      // Spring pull + critical damping, plus a soft magnet inside the capture
      // window so the strip gets sucked into the slot as it closes in. NOTE:
      // the spring term must be +stiffness * offset — a minus sign turns it
      // into positive feedback and the strip takes off (diverges, and once
      // position passes 2^53 the slot math collapses: duplicate keys + every
      // pill stacked at center).
      let acceleration =
        SETTLE_PHYSICS.stiffness * offset -
        2 * SETTLE_PHYSICS.dampingRatio * naturalOmega * velocity;
      if (distanceToTarget < SETTLE_PHYSICS.magnetRadius) {
        acceleration +=
          SETTLE_PHYSICS.magnetStrength *
          Math.sign(offset) *
          (distanceToTarget / SETTLE_PHYSICS.magnetRadius);
      }
      velocity += acceleration * dt;
      position += velocity * dt;
      // Runaway guard: a diverging (or non-finite) spring should never spin the
      // tab forever — snap to the slot and stop.
      if (!Number.isFinite(position) || !Number.isFinite(velocity) || Math.abs(velocity) > 256) {
        posRef.current = to;
        paint(to, stations);
        commit(mod(Math.round(to), totalStationCount), totalStationCount);
        return;
      }
      if (Math.abs(position - settleTarget) < 0.002 && Math.abs(velocity) < 0.01) {
        posRef.current = to;
        paint(to, stations);
        commit(mod(Math.round(to), totalStationCount), totalStationCount);
        return;
      }
      posRef.current = position;
      paint(position, stations);
      snapRafRef.current = requestAnimationFrame(step);
    };
    snapRafRef.current = requestAnimationFrame(step);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      settleAt(posRef.current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      settleAt(posRef.current - 1);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (totalStationCount === 0) return;
    cancelSnap();
    dragRef.current = {
      startX: event.clientX,
      grabPos: posRef.current,
      lastX: event.clientX,
      lastT: event.timeStamp,
      vel: 0,
      moved: false,
    };
    gestureMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const now = event.timeStamp;
    const dxEvent = event.clientX - drag.lastX;
    // Only genuine motion (> IDLE_RESET_PX) resets the idle clock and feeds the
    // velocity EMA — real mice emit micro-jitters while "holding still", which
    // would otherwise keep the idle time pinned at zero and resurrect the
    // ghost-fling at release.
    if (Math.abs(dxEvent) > IDLE_RESET_PX) {
      const dt = now - drag.lastT;
      if (dt > 0) {
        const instantaneous = dt < 120 ? dxEvent / dt : drag.vel;
        drag.vel =
          drag.vel === 0
            ? instantaneous
            : VEL_EMA_ALPHA * instantaneous + (1 - VEL_EMA_ALPHA) * drag.vel;
      }
      drag.lastT = now;
    }
    drag.lastX = event.clientX;
    if (Math.abs(dx) > 3) drag.moved = true;
    // Throttle pointer-move paints to animation frames.
    pendingPosRef.current = drag.grabPos + dx / STEP_PX;
    posRef.current = pendingPosRef.current;
    if (flushRafRef.current === null) {
      flushRafRef.current = requestAnimationFrame(() => {
        flushRafRef.current = null;
        paint(posRef.current, stations);
      });
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.moved) return;
    gestureMovedRef.current = true;
    if (prefersReducedMotion) {
      const target = Math.round(posRef.current);
      posRef.current = mod(target, totalStationCount);
      paint(posRef.current, stations);
      commit(target, totalStationCount);
      return;
    }
    // Momentum dies while the pointer holds still (release happens long after
    // the last pointermove — no move events fire when parked) — otherwise a
    // fast drag that's paused then released would ghost-fling from stale
    // velocity. Exponential decay over the idle time; a stationary hold beyond
    // IDLE_KILL_MS cancels ALL momentum so the dial simply magnet-snaps to the
    // parked station.
    const idleMs = event.timeStamp - drag.lastT;
    const effectiveVelocity =
      idleMs > IDLE_KILL_MS || idleMs <= 0
        ? 0
        : drag.vel * Math.exp(-idleMs / FLING_IDLE_DECAY_MS);
    const speed = Math.abs(effectiveVelocity);
    const linearStations = (speed * FLING_TRAVEL_MS) / STEP_PX;
    const linearAtRef = (FLING_REF_VELOCITY * FLING_TRAVEL_MS) / STEP_PX;
    // Slow flicks keep the exact (praised) linear feel; above the reference the
    // roll-out bends over a smoothstep so medium flicks don't ride the steep
    // slope and only violent flicks approach the cap.
    let flingStations: number;
    if (speed <= FLING_REF_VELOCITY) {
      flingStations = linearStations;
    } else {
      const bend = Math.max(
        0,
        Math.min(1, (speed - FLING_REF_VELOCITY) / (FLING_CURVE_TOP - FLING_REF_VELOCITY))
      );
      const easedBend = bend * bend * (3 - 2 * bend);
      flingStations = linearAtRef + (FLING_MAX_STATIONS - linearAtRef) * easedBend;
    }
    flingStations = Math.sign(effectiveVelocity) * flingStations;
    // Seed the spring with release momentum so it rolls out, not ramps down.
    settleAt(posRef.current + flingStations, flingStations / SEED_TRAVEL_S);
  };

  // Accept external index changes (category switched elsewhere, rehydration).
  useEffect(() => {
    if (totalStationCount === 0) return;
    if (dragRef.current) return;
    cancelSnap();
    const normalized = mod(activeStationIndex, totalStationCount);
    posRef.current = normalized;
    renderedRoundRef.current = Number.NaN;
    lastCommittedRef.current = normalized;
    paint(normalized, stations);
  }, [activeStationIndex, stations, totalStationCount]);

  // Drop internals on unmount.
  useEffect(() => cancelSnap, []);

  const handleSlotClick = (slot: number) => {
    if (gestureMovedRef.current) return;
    settleAt(pillStationRefs.current[slot]);
  };

  if (totalStationCount === 0) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Lofi music station selector"
      data-station-dial
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={cn(
        "relative mx-auto w-full max-w-lg cursor-grab touch-pan-y select-none focus:outline-none active:cursor-grabbing",
        focusRingClass,
        className
      )}
    >
      {/* Edge fading mask — peripheral pills dissolve before the clip edge */}
      <div
        className="relative h-16 overflow-hidden px-6"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 26%, black 74%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 26%, black 74%, transparent 100%)",
        }}
      >
        {SLOT_OFFSETS.map((_offset, slot) => (
          <button
            key={`slot-${slot}`}
            ref={(node) => {
              pillRefs.current[slot] = node;
            }}
            type="button"
            role="radio"
            aria-checked="false"
            onClick={() => handleSlotClick(slot)}
            tabIndex={-1}
            className={cn(pillBaseClass, focusRingClass)}
          >
            <span
              className="inline-flex"
              ref={composeLabelRef}
            />
          </button>
        ))}
      </div>
    </div>
  );
}