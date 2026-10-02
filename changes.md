# Sliding Vertical Digit Counter — Specification & Component Implementation

This specification defines the architecture, motion physics, and component code for a rolling, vertical-slide digit counter matching the tactile precision of high-end clock interfaces.

---

## 1. Mechanical & Motion Mechanics

### The Strip Translation Model
Rather than mounting and unmounting DOM nodes via presence animations, each digit column operates as a fixed-height optical window (`overflow: hidden`) containing a continuous vertical strip of numerals from `0` to `9`.

$$\text{Target Translation Y} = -(\text{Digit Value} \times 10\%)$$

* **Zero Layout Shift:** The bounding box dimension is locked to the exact height and width of a single tabular numeral. The container width never fluctuates when transitioning between narrower glyphs (such as `1`) and wider glyphs (such as `8`).
* **GPU Compositing:** State changes update only `transform: translateY(...)`. No properties that trigger layout reflow or repainting (`top`, `height`, `margin`) are animated.
* **Rolling Direction:** Transitions animate along the Y-axis using a high-tension spring curve to mimic physical rotary drum movements.

---

## 2. Motion Curve & Accessibility Tokens

| Property | Default Value | Reduced Motion Variant |
| :--- | :--- | :--- |
| **Animation Primitive** | CSS Transitions / Framer Motion Spring | Instant Swap / Linear Crossfade |
| **Spring Stiffness** | `320` | Not Applicable |
| **Spring Damping** | `30` | Not Applicable |
| **Mass** | `0.8` | Not Applicable |
| **Timing Function (CSS fallback)** | `cubic-bezier(0.16, 1, 0.3, 1)` (Custom Apple ease-out) | `step-start` |
| **Duration (CSS fallback)** | `450ms` | `0ms` |

---

## 3. Directory Structure

components/timer/
├── SlidingDigitCounter.tsx
├── SlidingDigitColumn.tsx
└── ColonSeparator.tsx


---

## 4. Component Implementation

### Subcomponent: Single Digit Column (`components/timer/SlidingDigitColumn.tsx`)

```tsx
"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface SlidingDigitColumnProps {
  digitValue: number;
}

const DIGIT_RANGE: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const SlidingDigitColumn: React.FC<SlidingDigitColumnProps> = ({ digitValue }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div 
      className="relative inline-block h-[1.15em] w-[0.62em] overflow-hidden align-top tabular-nums select-none"
      aria-hidden="true"
    >
      <motion.div
        className="flex flex-col items-center will-change-transform"
        initial={false}
        animate={{
          y: prefersReducedMotion ? 0 : `-${digitValue * 10}%`,
        }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                type: "spring",
                stiffness: 340,
                damping: 32,
                mass: 0.8,
              }
        }
      >
        {DIGIT_RANGE.map((singleNumber) => (
          <span
            key={singleNumber}
            className="flex h-[1.15em] items-center justify-center font-mono leading-none tracking-tighter"
          >
            {prefersReducedMotion && singleNumber !== digitValue ? null : singleNumber}
          </span>
        ))}
      </motion.div>
    </div>
  );
};
Subcomponent: Delimiter (components/timer/ColonSeparator.tsx)
TypeScript
import React from "react";

export const ColonSeparator: React.FC = () => {
  return (
    <span 
      aria-hidden="true" 
      className="inline-flex h-[1.15em] w-[0.3em] items-center justify-center font-mono font-bold leading-none select-none text-white/50"
    >
      :
    </span>
  );
};
Main Orchestrator: Sliding Digit Counter (components/timer/SlidingDigitCounter.tsx)
TypeScript
"use client";

import React, { useMemo } from "react";
import { SlidingDigitColumn } from "./SlidingDigitColumn";
import { ColonSeparator } from "./ColonSeparator";

interface SlidingDigitCounterProps {
  totalSecondsRemaining: number;
  timerStatusLabel?: string;
}

export const SlidingDigitCounter: React.FC<SlidingDigitCounterProps> = ({
  totalSecondsRemaining,
  timerStatusLabel = "Focus Session",
}) => {
  const {
    minutesTensDigit,
    minutesOnesDigit,
    secondsTensDigit,
    secondsOnesDigit,
    formattedAccessibleTime,
  } = useMemo(() => {
    const clampedTotalSeconds = Math.max(0, totalSecondsRemaining);
    const calculatedMinutes = Math.floor(clampedTotalSeconds / 60);
    const calculatedSeconds = clampedTotalSeconds % 60;

    const minutesTens = Math.floor(calculatedMinutes / 10);
    const minutesOnes = calculatedMinutes % 10;
    const secondsTens = Math.floor(calculatedSeconds / 10);
    const secondsOnes = calculatedSeconds % 10;

    const accessibleString = `${calculatedMinutes} minutes and ${calculatedSeconds} seconds remaining`;

    return {
      minutesTensDigit: minutesTens,
      minutesOnesDigit: minutesOnes,
      secondsTensDigit: secondsTens,
      secondsOnesDigit: secondsOnes,
      formattedAccessibleTime: accessibleString,
    };
  }, [totalSecondsRemaining]);

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-col items-center justify-center"
    >
      {/* Screen-reader-only element guarantees accessibility compliance without reading out split animated spans */}
      <span className="sr-only">
        {formattedAccessibleTime} — {timerStatusLabel}
      </span>

      {/* Visual Render Target */}
      <div 
        className="flex items-center justify-center font-mono font-bold text-white text-6xl sm:text-7xl md:text-8xl tracking-tight"
        style={{
          fontSize: "clamp(3.75rem, 12vw, 7.5rem)",
          lineHeight: 1,
        }}
      >
        {/* Minutes Pair */}
        <SlidingDigitColumn digitValue="{minutesTensDigit}"/>
        <SlidingDigitColumn digitValue="{minutesOnesDigit}"/>

        {/* Static Visual Colon */}
        <ColonSeparator/>

        {/* Seconds Pair */}
        <SlidingDigitColumn digitValue="{secondsTensDigit}"/>
        <SlidingDigitColumn digitValue="{secondsOnesDigit}"/>
      </div>
    </div>
  );
};
5. Web Interface Guidelines Compliance Matrix
Font & Metrics Lock: Both columns and glyphs define explicit widths (w-[0.62em]) and heights (h-[1.15em]), locking proportions proportionally regardless of fluid text scaling via clamp().

Screen Reader Announcer: The moving components are hidden with aria-hidden="true". A semantic parent container features aria-live="polite" coupled with an .sr-only span reading complete timestamps ("24 minutes and 59 seconds remaining").

Hardware Acceleration: Motion nodes explicitly leverage .will-change-transform to elevate active rolls into dedicated GPU compositor layers, eliminating layout recalibrations across intervals.

Prefers Reduced Motion: The useReducedMotion() hook prevents multi-digit translational drum animation when the user flags accessibility motion constraints, rendering the exact single number without transitions.
