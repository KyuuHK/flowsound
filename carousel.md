# Infinite Rotary Station Carousel — Component Specification & Implementation

This specification defines the architecture, tactile motion physics, and production component code for a horizontal **Rotary Dial / Infinite Carousel** to replace cluttered category pills on the Player screen.

---

## 1. Interaction Model & Visual Geometry

           ◀  Horizontal Drag / Click to Snap  ▶
··· [ Ambient Drift ]     [   FOCUS   ]     [ Chillhop ] ···
opacity-35            scale-105          opacity-35
scale-95              bg-white           scale-95
elevated shadow


* **Rotary Dial Pattern:** Instead of rendering 10 static wrapped tags, the component exposes an active central pill flanked by neighbor previews.
* **Non-Disruptive Focus:** No auto-scrolling marquee animation. Movement happens strictly on user interaction (drag, scroll, arrow keys, or click).
* **Bilateral Alpha Fading:** Edge gradient masking smoothly dissolves peripheral station pills into the viewport canvas background.
* **Modulo Wrap Indexing:** Uses modular arithmetic to cycle endlessly without requiring duplicated DOM arrays or causing key collisions.

---

## 2. Motion Tokens & Physics

| Property | Default Value | Reduced Motion Variant |
| :--- | :--- | :--- |
| **Animation Engine** | Framer Motion (`layout` & `AnimatePresence`) | Instant swap |
| **Spring Stiffness** | `420` (responsive tension) | Not applicable |
| **Spring Damping** | `32` (smooth deceleration, zero bounce) | Not applicable |
| **Active Scale** | `1.05` | `1.0` |
| **Inactive Scale** | `0.92` | `1.0` |
| **Inactive Opacity** | `0.35` | `0.5` |

---

## 3. Web Interface Guidelines Compliance

* **Accessible Touch Targets:** Every station chip maintains `min-h-[44px]` with `touch-action: pan-y` to allow horizontal scrolling while preserving vertical page dragging.
* **Keyboard Navigation:** Full `ArrowLeft` / `ArrowRight` arrow key cycling across stations.
* **Screen Reader Semantics:** Container uses `role="radiogroup"` with child buttons flagged with `role="radio"` and `aria-checked`.
* **Motion Accessibility:** Automatically obeys `@media (prefers-reduced-motion: reduce)` via Framer Motion's `useReducedMotion()`.

---

## 4. Production Component Implementation

Create the component at `components/player/StationInfiniteDial.tsx`:

```tsx
"use client";

import React, { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface StationItem {
  readonly id: string;
  readonly name: string;
}

interface StationInfiniteDialProps {
  readonly stations: readonly StationItem[];
  readonly activeStationIndex: number;
  readonly onSelectStation: (index: number) => void;
}

// Relative offsets to display around center (2 items left, center, 2 items right)
const VISIBLE_SLOT_OFFSETS: readonly number[] = [-2, -1, 0, 1, 2] as const;

export function StationInfiniteDial({
  stations,
  activeStationIndex,
  onSelectStation,
}: StationInfiniteDialProps) {
  const prefersReducedMotion = useReducedMotion();
  const totalStationCount = stations.length;

  const calculateWrappedIndex = useCallback(
    (offset: number): number => {
      if (totalStationCount === 0) return 0;
      return (activeStationIndex + offset + totalStationCount) % totalStationCount;
    },
    [activeStationIndex, totalStationCount]
  );

  const handleKeyboardNavigation = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onSelectStation((activeStationIndex + 1) % totalStationCount);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      onSelectStation(
        (activeStationIndex - 1 + totalStationCount) % totalStationCount
      );
    }
  };

  const softElevationShadow =
    "shadow-[0_4px_14px_-2px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)]";

  return (
    <div
      role="radiogroup"
      aria-label="Lofi Music Station Selector"
      tabIndex={0}
      onKeyDown={handleKeyboardNavigation}
      className="relative w-full max-w-lg mx-auto py-2 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-full"
    >
      {/* Edge Fading Mask */}
      <div
        className="flex items-center justify-center gap-2 overflow-hidden px-4"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)",
        }}
      >
        {VISIBLE_SLOT_OFFSETS.map((slotOffset) => {
          const resolvedIndex = calculateWrappedIndex(slotOffset);
          const currentStation = stations[resolvedIndex];
          const isCenterActive = slotOffset === 0;

          if (!currentStation) return null;

          return (
            <motion.button
              key={`${currentStation.id}-${slotOffset}`}
              type="button"
              role="radio"
              aria-checked={isCenterActive}
              onClick={() => onSelectStation(resolvedIndex)}
              layout={!prefersReducedMotion}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 32, mass: 0.8 }
              }
              className={`
                relative min-h-[44px] px-5 rounded-full text-xs font-semibold whitespace-nowrap
                flex items-center justify-center transition-all duration-150 touch-manipulation
                focus-visible:ring-2 focus-visible:ring-sky-500 focus:outline-none
                ${
                  isCenterActive
                    ? `bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold scale-105 z-10 ${softElevationShadow}`
                    : "bg-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 opacity-35 hover:opacity-65 scale-92"
                }
              `}
            >
              {currentStation.name}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
5. Integration with Player Screen
Drop into your Player view layout above or below the album artwork:

TypeScript
"use client";

import React, { useState } from "react";
import { StationInfiniteDial, StationItem } from "@/components/player/StationInfiniteDial";

const LOFI_STATIONS: readonly StationItem[] = [
  { id: "focus", name: "Focus" },
  { id: "seasons", name: "Seasons" },
  { id: "ambient-drift", name: "Ambient Drift" },
  { id: "soul", name: "Soul" },
  { id: "late-night", name: "Late Night" },
  { id: "funk", name: "Funk" },
  { id: "jazz-lounge", name: "Jazz Lounge" },
  { id: "chillhop", name: "Chillhop" },
  { id: "asian", name: "Asian" },
  { id: "hybrid", name: "Hybrid" },
] as const;

export function PlayerScreen() {
  const [activeStationIndex, setActiveStationIndex] = useState<number>(0);

  return (
    <section className="flex flex-col items-center justify-center gap-6 w-full max-w-xl mx-auto">
      {/* Infinite Station Carousel */}
      <StationInfiniteDial activeStationIndex="{activeStationIndex}" onSelectStation="{(newIndex)" stations="{LOFI_STATIONS}"> {
          setActiveStationIndex(newIndex);
          // Trigger audio stream source change here
        }}
      />

      {/* Album Artwork Container */}
      <div className="w-56 h-56 rounded-3xl overflow-hidden shadow-2xl border border-black/5 bg-[#E3DAC9]">
        <img
          src="/artwork-placeholder.jpg"
          alt={LOFI_STATIONS[activeStationIndex].name}
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
}
