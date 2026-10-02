"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

interface SlidingDigitColumnProps {
  digitValue: number;
  className?: string;
}

export function SlidingDigitColumn({ digitValue, className }: SlidingDigitColumnProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-flex h-[1.15em] w-[0.66em] items-center justify-center leading-none select-none", className)}
      >
        {digitValue}
      </span>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="relative inline-block h-[1.15em] w-[0.66em] overflow-hidden align-top select-none"
    >
      <div
        className={cn(
          "flex flex-col items-center will-change-transform",
          "transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          className
        )}
        style={{ transform: `translateY(-${Math.min(9, digitValue) * 10}%)` }}
      >
        {DIGITS.map((value) => (
          <span
            key={value}
            className="flex h-[1.15em] items-center justify-center leading-none"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}