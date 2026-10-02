# Segmented Control Navigation & Satellite Action — Component Specification

This specification outlines the architecture, visual tokens, interaction model, and production-ready React implementation for the top-left floating **Segmented Control** (animated sliding pill tabs) and its companion **Satellite Theme Button**, inspired by `focus.itshassco.com` and Apple Human Interface Guidelines.

---

## 1. Anatomy & Visual Layout

```
  ┌────────────────────────────────────────────────────────┐   ┌─────────┐
  │ Track (Translucent Pill Track)                         │   │ Action  │
  │                                                        │   │ Button  │
  │   Watch       ┌──────────────┐      World Time         │   │   🎨    │
  │ (Inactive)    │    Focus     │      (Inactive)         │   │         │
  │               │   (Active)   │                         │   │         │
  │               └──────────────┘                         │   │         │
  │               Elevated white                           │   │         │
  │               sliding thumb pill                       │   │         │
  └────────────────────────────────────────────────────────┘   └─────────┘
```

The component consists of two adjacent interactive elements aligned horizontally:

1. **Outer Track Capsule (`role="tablist"`):**
   - Pill-shaped container (`rounded-full`) with a subtle translucent fill (`bg-black/[0.05]` in light mode, `bg-white/[0.08]` in dark mode).
   - Uniform inner padding (`p-1` / 4px) serving as a physical rail for the sliding active thumb.
   - Frosted glass backdrop blur (`backdrop-blur-md`) with a delicate hairline stroke (`border border-black/[0.02]`).

2. **Sliding Thumb Indicator (`layoutId="activeScreenIndicator"`):**
   - High-contrast elevated surface (`bg-white` in light mode, `bg-neutral-900` in dark mode).
   - Dual-tier subtle drop shadow (`shadow-[0_2px_8px_-1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]`).
   - Animated with spring physics (`stiffness: 450, damping: 35`) that glides across tabs when the selection changes.
   - Bold label typography (`font-bold text-neutral-900 dark:text-white`).

3. **Inactive Tabs:**
   - Background-free, neutral muted text (`text-neutral-500 hover:text-neutral-800`).
   - Smooth color transition on hover and focus.

4. **Satellite Theme Button (Companion Circle):**
   - Detached circular button (`w-11 h-11 rounded-full aspect-square`).
   - Matches the exact height, surface fill, and elevation shadow of the active sliding pill for visual harmony.
   - Tactile spring response on click (`active:scale-95`).

---

## 2. Web Interface Guidelines Compliance

| Guideline | Implementation Detail |
| :--- | :--- |
| **Keyboard Accessibility** | Full `ArrowRight` / `ArrowLeft` keyboard navigation across tabs with automatic roving `tabIndex`. |
| **Clear Focus Rings** | Visible, non-obscured `:focus-visible:ring-2 focus-visible:ring-sky-500` ring. |
| **Hit Targets ≥ 44px** | Minimum button target size set to `min-h-[44px]` with `touch-action: manipulation` to prevent double-tap zoom delay on touchscreens. |
| **Reduced Motion** | Hooks into `useReducedMotion()`. If the user enables reduced motion, spring sliding is disabled in favor of immediate swaps. |
| **WAI-ARIA Semantics** | Semantic `role="tablist"`, `role="tab"`, `aria-selected`, and `aria-controls` references. |

---

## 3. Motion Tokens & Transition Physics

- **Framework:** Framer Motion (`motion.div` with shared layout).
- **Spring Stiffness:** `450` (high tension, snappy response).
- **Spring Damping:** `35` (zero oscillation / zero bounce overshoot).
- **Mass:** `0.8` (low inertia).
- **Fallback (Reduced Motion):** `duration: 0` (instant jump).

---

## 4. Production Component Implementation

```tsx
"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Palette } from "lucide-react";

export type ScreenModeIdentifier = "watch" | "focus" | "world-time";

export interface NavigationTabOption {
  readonly identifier: ScreenModeIdentifier;
  readonly displayLabel: string;
}

interface NavigationSegmentedControlProps {
  readonly activeScreen: ScreenModeIdentifier;
  readonly onScreenChange: (selectedScreen: ScreenModeIdentifier) => void;
  readonly onToggleThemeMenu?: () => void;
}

const NAVIGATION_TABS: readonly NavigationTabOption[] = [
  { identifier: "watch", displayLabel: "Watch" },
  { identifier: "focus", displayLabel: "Focus" },
  { identifier: "world-time", displayLabel: "World Time" },
] as const;

export function NavigationSegmentedControl({
  activeScreen,
  onScreenChange,
  onToggleThemeMenu,
}: NavigationSegmentedControlProps) {
  const prefersReducedMotion = useReducedMotion();

  // WAI-ARIA keyboard navigation for tabs (Arrow keys cycle options)
  const handleKeyboardNavigation = (
    keyboardEvent: React.KeyboardEvent<HTMLButtonElement>,
    currentTabIndex: number
  ) => {
    if (keyboardEvent.key === "ArrowRight") {
      keyboardEvent.preventDefault();
      const nextIndex = (currentTabIndex + 1) % NAVIGATION_TABS.length;
      onScreenChange(NAVIGATION_TABS[nextIndex].identifier);
    } else if (keyboardEvent.key === "ArrowLeft") {
      keyboardEvent.preventDefault();
      const previousIndex =
        (currentTabIndex - 1 + NAVIGATION_TABS.length) % NAVIGATION_TABS.length;
      onScreenChange(NAVIGATION_TABS[previousIndex].identifier);
    }
  };

  return (
    <nav aria-label="Screen mode navigation" className="flex items-center gap-2 select-none">
      {/* Outer Segmented Track */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="
          flex items-center p-1 rounded-full
          bg-black/[0.05] dark:bg-white/[0.08]
          backdrop-blur-md border border-black/[0.02] dark:border-white/[0.05]
        "
      >
        {NAVIGATION_TABS.map((singleTab, tabIndex) => {
          const isSelected = activeScreen === singleTab.identifier;

          return (
            <button
              key={singleTab.identifier}
              type="button"
              role="tab"
              id={`navigation-tab-${singleTab.identifier}`}
              aria-selected={isSelected}
              aria-controls={`screen-panel-${singleTab.identifier}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onScreenChange(singleTab.identifier)}
              onKeyDown={(event) => handleKeyboardNavigation(event, tabIndex)}
              className={`
                relative min-h-[44px] px-5
                rounded-full text-xs sm:text-sm font-medium
                transition-colors duration-150 ease-out
                focus-visible:ring-2 focus-visible:ring-sky-500 focus:outline-none
                touch-manipulation flex items-center justify-center
                ${
                  isSelected
                    ? "text-neutral-900 dark:text-white font-bold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }
              `}
            >
              {/* Animated Floating Pill (Active Indicator) */}
              {isSelected && (
                <motion.div
                  layoutId="activeNavigationThumbIndicator"
                  aria-hidden="true"
                  className="
                    absolute inset-0 rounded-full bg-white dark:bg-neutral-900
                    shadow-[0_2px_8px_-1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]
                    border border-black/[0.03] dark:border-white/10
                  "
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 450, damping: 35 }
                  }
                />
              )}

              {/* Text Label positioned above the sliding thumb */}
              <span className="relative z-10">{singleTab.displayLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Satellite Theme / Color Palette Button */}
      <button
        type="button"
        onClick={onToggleThemeMenu}
        aria-label="Open theme and color customization"
        className="
          w-11 h-11 min-w-[44px] min-h-[44px] rounded-full
          bg-white dark:bg-neutral-900
          border border-black/[0.03] dark:border-white/10
          shadow-[0_2px_8px_-1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]
          flex items-center justify-center
          text-neutral-900 dark:text-white
          active:scale-95 transition-transform duration-100 ease-out
          focus-visible:ring-2 focus-visible:ring-sky-500 focus:outline-none
          touch-manipulation
        "
      >
        <Palette className="w-5 h-5" aria-hidden="true" />
      </button>
    </nav>
  );
}
```

---

## 5. Usage in Parent Layout

```tsx
"use client";

import React, { useState } from "react";
import {
  NavigationSegmentedControl,
  ScreenModeIdentifier,
} from "@/components/NavigationSegmentedControl";

export default function DashboardLayout() {
  const [activeScreen, setActiveScreen] = useState<ScreenModeIdentifier>("focus");

  return (
    <header className="fixed top-6 left-6 z-50">
      <NavigationSegmentedControl
        activeScreen={activeScreen}
        onScreenChange={(newScreen) => setActiveScreen(newScreen)}
        onToggleThemeMenu={() => console.log("Open theme selector modal")}
      />
    </header>
  );
}
```
