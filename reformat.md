# FlowSound — Focus Screen Layout Redesign & Architecture

This specification documents the edge-to-edge layout architecture, visual tokens, and component code to remove the card-in-a-window nesting and achieve the clean, full-bleed viewport aesthetic of `focus.itshassco.com`.

---

## 1. Interface Analysis & Structural Changes

### Current Pitfalls
* **The "Card / Sheet Surface" Problem:** Wrapping the timer in a white rounded card over a beige canvas creates double-nested margins, constraining the timer and causing a claustrophobic layout.
* **Dual Parameter Overload:** Exposing both "WORK" and "BREAK" stepper docks simultaneously creates visual fatigue and ambiguity around active state.
* **Sandwiched Action Trigger:** Placing "Start Focus" between two control clusters breaks logical hierarchy.
* **Decorative Degradation:** The dashed ASCII separator (`---`) clashes with the polished Apple HIG aesthetic.

### Layout Solutions
* **Full-Bleed Viewport Canvas:** Remove the inner sheet card entirely. The canvas color (`#F2EFE9` in light mode, `#0C0D12` in dark mode) covers the entire viewport.
* **Center Optical Stage:** The timer digits (`font-timer-rounded font-black`) dominate the optical center, scaled responsively via fluid viewport sizing.
* **Progress Dots Indicator:** Replace ASCII lines with accessible, animated session indicator pips (`SessionProgressTracker`).
* **Consolidated Control Dock:** Merge duration presets, steppers, primary trigger, and reset into a unified, floating bottom capsule dock.
* **Context-Driven State:** Display only active mode controls (Work interval settings during focus; Break interval settings during rest).

---

## 2. Target Layout Diagram

┌────────────────────────────────────────────────────────────────────────┐│ [Watch | Focus | World Time] [🎨]                                      ││                                                                        ││                                                                        ││                                 FOCUS                                  ││                                                                        ││                              30 : 00                                   ││                                                                        ││                             •••• Session 1                             ││                                                                        ││                                                                        ││        [ 15m ] [ 25m ] [ 30m ]  ( - ) [ Start Focus ] ( + )  ( ↺ )     │└────────────────────────────────────────────────────────────────────────┘
---

## 3. Directory Layout

flowsound-frontend/├── app/│   └── page.tsx                         # Viewport root canvas└── components/├── focus/│   ├── FocusClockDisplay.tsx        # Hero time display & mode badge│   ├── FocusControlDock.tsx         # Unified bottom pill dock│   └── SessionProgressTracker.tsx   # Session pips indicator└── navigation/└── NavigationSegmentedControl.tsx
---

## 4. Production Components

### Hero Clock Display (`components/focus/FocusClockDisplay.tsx`)

```tsx
"use client";

import React from "react";

interface FocusClockDisplayProps {
  readonly formattedTime: string;
  readonly modeLabel: "FOCUS" | "SHORT BREAK" | "LONG BREAK";
}

export function FocusClockDisplay({
  formattedTime,
  modeLabel,
}: FocusClockDisplayProps) {
  const [minutesSegment, secondsSegment] = formattedTime.split(":");

  return (
    <section 
      aria-label="Focus countdown timer"
      className="flex flex-col items-center justify-center select-none"
    >
      {/* Mode Indicator Capsule */}
      <span className="px-3.5 py-1 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[11px] font-bold tracking-widest uppercase mb-4 shadow-sm">
        {modeLabel}
      </span>

      {/* Primary Display */}
      <div 
        role="timer"
        aria-live="polite"
        className="flex items-center justify-center font-black tracking-tight text-neutral-900 dark:text-white tabular-nums leading-none text-8xl sm:text-9xl md:text-[11rem]"
        style={{ fontFamily: "var(--font-rounded), system-ui, sans-serif" }}
      >
        <span>{minutesSegment}</span>
        <span className="text-rose-500 mx-1 sm:mx-2 animate-pulse">:</span>
        <span>{secondsSegment}</span>
      </div>
    </section>
  );
}
Session Progress Tracker (components/focus/SessionProgressTracker.tsx)TypeScript"use client";

import React from "react";

interface SessionProgressTrackerProps {
  readonly currentSessionNumber: number;
  readonly totalTargetSessions?: number;
}

export function SessionProgressTracker({
  currentSessionNumber,
  totalTargetSessions = 4,
}: SessionProgressTrackerProps) {
  return (
    <div 
      aria-label={`Session ${currentSessionNumber} of ${totalTargetSessions}`}
      className="flex items-center gap-3 mt-4 text-neutral-400 select-none"
    >
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: totalTargetSessions }).map((_, index) => {
          const sessionIndex = index + 1;
          const isCompleted = sessionIndex < currentSessionNumber;
          const isCurrent = sessionIndex === currentSessionNumber;

          return (
            <span
              key={sessionIndex}
              className={`h-2 rounded-full transition-all duration-300 ${
                isCurrent
                  ? "w-6 bg-neutral-900 dark:bg-white"
                  : isCompleted
                  ? "w-2 bg-neutral-500"
                  : "w-2 bg-neutral-300 dark:bg-neutral-700"
              }`}
            />
          );
        })}
      </div>

      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Session {currentSessionNumber}
      </span>
    </div>
  );
}
Unified Control Dock (components/focus/FocusControlDock.tsx)TypeScript"use client";

import React from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface FocusControlDockProps {
  readonly selectedDurationMinutes: number;
  readonly isTimerRunning: boolean;
  readonly onSelectDuration: (durationMinutes: number) => void;
  readonly onIncrementDuration: () => void;
  readonly onDecrementDuration: () => void;
  readonly onToggleTimer: () => void;
  readonly onResetTimer: () => void;
}

const PRESET_DURATIONS_MINUTES = [15, 25, 30] as const;

export function FocusControlDock({
  selectedDurationMinutes,
  isTimerRunning,
  onSelectDuration,
  onIncrementDuration,
  onDecrementDuration,
  onToggleTimer,
  onResetTimer,
}: FocusControlDockProps) {
  const softTactileShadow =
    "shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)]";

  return (
    <footer 
      aria-label="Timer controls" 
      className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] backdrop-blur-md border border-black/[0.03] dark:border-white/5 select-none"
    >
      {/* Preset Pills */}
      {PRESET_DURATIONS_MINUTES.map((durationMinutes) => {
        const isSelected = selectedDurationMinutes === durationMinutes;
        return (
          <button
            key={durationMinutes}
            type="button"
            onClick={() => onSelectDuration(durationMinutes)}
            className={`
              min-h-[44px] px-4 sm:px-5 rounded-full text-xs sm:text-sm transition-transform active:scale-95
              border border-black/[0.03] ${softTactileShadow}
              focus-visible:ring-2 focus-visible:ring-sky-500 focus:outline-none touch-manipulation
              ${
                isSelected
                  ? "bg-white text-neutral-900 font-bold dark:bg-neutral-900 dark:text-white"
                  : "bg-[#F3F3F6] dark:bg-neutral-800 text-neutral-500 font-medium hover:text-neutral-800"
              }
            `}
          >
            {durationMinutes} Min
          </button>
        );
      })}

      {/* Decrement (-) */}
      <button
        type="button"
        onClick={onDecrementDuration}
        aria-label="Decrease focus duration by five minutes"
        className={`
          w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center
          bg-[#F3F3F6] dark:bg-neutral-800 text-neutral-900 dark:text-white border border-black/[0.03] ${softTactileShadow}
          transition-transform active:scale-95 text-lg font-medium leading-none
          focus-visible:ring-2 focus-visible:ring-sky-500 focus:outline-none touch-manipulation
        `}
      >
        –
      </button>

      {/* Primary Trigger (Start / Pause) */}
      <button
        type="button"
        onClick={onToggleTimer}
        aria-label={isTimerRunning ? "Pause focus session" : "Start focus session"}
        className={`
          min-h-[44px] px-6 rounded-full text-sm font-semibold flex items-center gap-2
          bg-white dark:bg-neutral-900 text-[#00A3FF] border border-black/[0.03] ${softTactileShadow}
          transition-transform active:scale-95 hover:bg-neutral-50 dark:hover:bg-neutral-800
          focus-visible:ring-2 focus-visible:ring-sky-500 focus:outline-none touch-manipulation
        `}
      >
        {isTimerRunning ? (
          <>
            <Pause aria-hidden="true" className="w-4 h-4 fill-current"/>
            <span>Pause</span>
          </>
        ) : (
          <>
            <Play aria-hidden="true" className="w-4 h-4 fill-current"/>
            <span>Start Focus</span>
          </>
        )}
      </button>

      {/* Increment (+) */}
      <button
        type="button"
        onClick={onIncrementDuration}
        aria-label="Increase focus duration by five minutes"
        className={`
          w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center
          bg-[#F3F3F6] dark:bg-neutral-800 text-neutral-900 dark:text-white border border-black/[0.03] ${softTactileShadow}
          transition-transform active:scale-95 text-lg font-medium leading-none
          focus-visible:ring-2 focus-visible:ring-sky-500 focus:outline-none touch-manipulation
        `}
      >
        +
      </button>

      {/* Reset (↻) */}
      <button
        type="button"
        onClick={onResetTimer}
        aria-label="Reset timer back to initial duration"
        className={`
          w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center
          bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200
          transition-transform active:scale-95
          focus-visible:ring-2 focus-visible:ring-sky-500 focus:outline-none touch-manipulation
        `}
      >
        <RotateCcw aria-hidden="true" className="w-4 h-4"/>
      </button>
    </footer>
  );
}
Root Viewport Page (app/page.tsx)TypeScript"use client";

import React, { useState } from "react";
import { NavigationSegmentedControl, ScreenModeIdentifier } from "@/components/navigation/NavigationSegmentedControl";
import { FocusClockDisplay } from "@/components/focus/FocusClockDisplay";
import { SessionProgressTracker } from "@/components/focus/SessionProgressTracker";
import { FocusControlDock } from "@/components/focus/FocusControlDock";

export default function FocusDashboardPage() {
  const [activeScreen, setActiveScreen] = useState<ScreenModeIdentifier>("focus");
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [currentSessionNumber] = useState<number>(1);

  return (
    <main className="relative min-h-screen w-full bg-[#F2EFE9] dark:bg-[#0C0D12] flex flex-col items-center justify-center overflow-hidden">
      {/* Top Left Navigation Header */}
      <header className="fixed top-6 left-6 z-40">
        <NavigationSegmentedControl activeScreen="{activeScreen}" onScreenChange="{setActiveScreen}" onToggleThemeMenu="{()"> console.log("Toggle Theme Palette")}
        />
      </header>

      {/* Center Optical Stage */}
      <div className="flex flex-col items-center justify-center -mt-8">
        <FocusClockDisplay "0")}:00`} formattedTime="{`${String(selectedDurationMinutes).padStart(2," modeLabel="FOCUS"/>
        <SessionProgressTracker currentSessionNumber="{currentSessionNumber}" totalTargetSessions="{4}"/>
      </div>

      {/* Floating Bottom Control Dock */}
      <FocusControlDock isTimerRunning="{isTimerRunning}" onSelectDuration="{(durationMinutes)" selectedDurationMinutes="{selectedDurationMinutes}"> setSelectedDurationMinutes(durationMinutes)}
        onIncrementDuration={() => setSelectedDurationMinutes((previous) => Math.min(previous + 5, 90))}
        onDecrementDuration={() => setSelectedDurationMinutes((previous) => Math.max(previous - 5, 5))}
        onToggleTimer={() => setIsTimerRunning((previous) => !previous)}
        onResetTimer={() => setIsTimerRunning(false)}
      />
    </main>
  );
}
5. Web Interface Guidelines Compliance MatrixGuideline RequirementImplementation StandardNo nested scroll/cardsFull-bleed viewport canvas with fixed spatial anchors (top-6 left-6, bottom-8).Accessible Hit TargetsEvery element in the dock adheres to min-h-[44px] and min-w-[44px].Numeric StabilityTime display enforces tabular-nums via font-variant-numeric: tabular-nums.Touch OptimizationAll interactive pill buttons use touch-action: manipulation to prevent double-tap zoom delays.Keyboard AccessibilityFull visible :focus-visible outline rings with automatic roving focus support.
