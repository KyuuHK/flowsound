"use client";

import { SlidingDigitCounter } from "@/components/timer/SlidingDigitCounter";
import { cn } from "@/lib/utils";

export type FocusPhase = "work" | "rest";

interface FocusClockDisplayProps {
  phaseLabel: string;
  seconds: number;
  running: boolean;
  className?: string;
}

/**
 * The optical hero of the Focus screen — the big drum, composed straight on
 * the cream canvas (reformat.md: timer digits dominate the center). No phase
 * badge, time bar, or session pips; the digits carry the screen.
 */
export function FocusClockDisplay({
  phaseLabel,
  seconds,
  running,
  className,
}: FocusClockDisplayProps) {
  return (
    <section
      aria-label="Focus countdown timer"
      className={cn(
        "flex w-full flex-col items-center justify-center select-none",
        className
      )}
    >
      <SlidingDigitCounter
        seconds={seconds}
        statusLabel={`${phaseLabel.toLowerCase()} ${running ? "running" : "paused"}`}
        className="text-[clamp(4rem,12vw,9rem)]"
      />
    </section>
  );
}