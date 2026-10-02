"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SlidingDigitColumn } from "./SlidingDigitColumn";
import { ColonSeparator } from "./ColonSeparator";

interface SlidingDigitCounterProps {
  seconds: number;
  statusLabel?: string;
  className?: string;
}

function splitTime(totalSeconds: number) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const secondsPart = safe % 60;
  return {
    minutesText: String(minutes).padStart(2, "0"),
    secondsText: String(secondsPart).padStart(2, "0"),
    minutes,
  };
}

export function SlidingDigitCounter({ seconds, statusLabel = "Focus Session", className }: SlidingDigitCounterProps) {
  const { minutesText, secondsText, minutes } = useMemo(
    () => splitTime(seconds),
    [seconds]
  );

  // Minute-granularity on purpose: a per-second aria-live re-announcement is
  // chatter for screen-reader users; the visual drum still shows seconds.
  const accessibleTime = `${minutes} minutes remaining`;

  return (
    <div className="flex flex-col items-center justify-center">
      <span
        key={accessibleTime}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {accessibleTime} — {statusLabel}
      </span>

      <div className={cn("text-[clamp(3.25rem,11vw,6rem)] font-extrabold tracking-tight", className)}>
        <span className="inline-flex items-center leading-none">
          {minutesText.split("").map((char, index) => (
            <SlidingDigitColumn key={index} digitValue={Number(char)} className="text-ink/80" />
          ))}
          <ColonSeparator />
          {secondsText.split("").map((char, index) => (
            <SlidingDigitColumn key={index} digitValue={Number(char)} className="text-ink" />
          ))}
        </span>
      </div>
    </div>
  );
}