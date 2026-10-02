"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Palette } from "lucide-react";
import { useHoverSteps } from "@/hooks/useHoverSteps";
import { usePressBounce } from "@/hooks/usePressBounce";
import { hoverZoomClass, hoverZoomCrispClass } from "@/lib/pressSurface";
import { cn } from "@/lib/utils";

export type TabId = "player" | "focus" | "tasks";

export interface TabOption {
  readonly id: TabId;
  readonly label: string;
}

interface NavigationSegmentedControlProps {
  readonly activeTab: TabId;
  readonly onTabChange: (tab: TabId) => void;
}

const TABS: readonly TabOption[] = [
  { id: "focus", label: "Focus" },
  { id: "player", label: "Player" },
  { id: "tasks", label: "Tasks" },
] as const;

const THUMB_TRANSITION = { type: "spring" as const, stiffness: 450, damping: 35, mass: 0.8 };

const tabBounceOptions = { plane: "translate" as const, start: 1, peak: -1.5 };

export function NavigationSegmentedControl({
  activeTab,
  onTabChange,
}: NavigationSegmentedControlProps) {
  const prefersReducedMotion = useReducedMotion();
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const tabBounceRef = usePressBounce(tabBounceOptions);
  const satelliteBounceRef = usePressBounce(0.9);
  const tabHoverRef = useHoverSteps();

  // Compose keyboard tracking, press bounce, and crisp two-tap hover on one
  // ref. React 19 invokes the returned cleanup before the next ref call.
  const composeTabRef = (index: number) => (el: HTMLButtonElement | null) => {
    tabsRef.current[index] = el;
    if (el) {
      const cleanupBounce = tabBounceRef(el);
      const cleanupZoom = tabHoverRef(el);
      return () => {
        cleanupBounce?.();
        cleanupZoom?.();
      };
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = (index + 1) % TABS.length;
        tabsRef.current[next]?.focus();
        onTabChange(TABS[next].id);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = (index - 1 + TABS.length) % TABS.length;
        tabsRef.current[prev]?.focus();
        onTabChange(TABS[prev].id);
      }
    },
    [onTabChange]
  );

  return (
    <nav aria-label="Screen mode navigation" className="flex items-center gap-2 select-none">
      {/* Segmented Track */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={cn(
          "flex items-center p-1 rounded-full",
          "bg-ink/[0.04] border border-ink/[0.06]"
        )}
      >
        {TABS.map((tab, index) => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={composeTabRef(index)}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "relative min-h-[44px] px-5",
                "rounded-full text-xs sm:text-sm font-semibold",
                "focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none",
                "touch-manipulation flex items-center justify-center",
                hoverZoomCrispClass,
                isSelected
                  ? "font-semibold text-ink"
                  : "text-ink-faint hover:text-ink-muted"
              )}
            >
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.div
                    layoutId="activeScreenIndicator"
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0 rounded-full bg-white",
                      "shadow-[0_2px_8px_-1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]",
                      "border border-ink/[0.04]"
                    )}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : THUMB_TRANSITION
                    }
                  />
                )}
              </AnimatePresence>
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Satellite Theme Button */}
      <button
        ref={satelliteBounceRef}
        type="button"
        aria-label="Open theme and color customization"
        className={cn(
          "w-[44px] h-[44px] rounded-full",
          "bg-white border border-ink/[0.04]",
          "shadow-[0_2px_8px_-1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]",
          "flex items-center justify-center text-ink",
          "focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none",
          "touch-manipulation",
          hoverZoomClass
        )}
      >
        <Palette className="h-5 w-5" aria-hidden="true" />
      </button>
    </nav>
  );
}
