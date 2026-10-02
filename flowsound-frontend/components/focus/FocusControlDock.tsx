"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { FocusPhase } from "@/components/focus/FocusClockDisplay";
import { useHoverSteps } from "@/hooks/useHoverSteps";
import { usePressBounce } from "@/hooks/usePressBounce";
import { hoverZoomClass, hoverZoomCrispClass } from "@/lib/pressSurface";
import { cn } from "@/lib/utils";

interface FocusControlDockProps {
  phase: FocusPhase;
  running: boolean;
  work: number;
  rest: number;
  workMax: number;
  restMax: number;
  onWork: (minutes: number) => void;
  onRest: (minutes: number) => void;
  onToggle: () => void;
  resetHold: number;
  onHoldPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onHoldPointerUp: () => void;
  onHoldPointerCancel: () => void;
  onHoldKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onHoldKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const WORK_PILLS = [15, 25, 30] as const;
const REST_PILLS = [3, 5, 10] as const;

const hoverZoomWrapClass = `inline-flex ${hoverZoomClass}`;

// Text-bearing controls = crisp shell: no CSS hover scale; `useHoverSteps`
// owns the zoom on the wrapper as a dense `steps(1,end)` ladder (each hop a
// fixed crisp size — the label never re-rasterizes mid-motion). Icon controls
// keep the springy CSS zoom.
const hoverZoomCrispWrapClass = `inline-flex ${hoverZoomCrispClass}`;

const crispBounce = { plane: "translate" as const, start: 1, peak: -1.5 };

const focusRingClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const pillFace =
  "flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold disabled:opacity-40";

interface PillProps {
  label: number;
  ariaLabel: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}

function Pill({ label, ariaLabel, active, disabled, onClick }: PillProps) {
  const bounceRef = usePressBounce(crispBounce);
  const zoomRef = useHoverSteps();
  return (
    <span ref={zoomRef} className={hoverZoomCrispWrapClass}>
      <button
        ref={bounceRef}
        type="button"
        aria-label={ariaLabel}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          pillFace,
          "bg-white",
          focusRingClass,
          active ? "text-ink" : "text-ink-muted"
        )}
      >
        {label}
      </button>
    </span>
  );
}

interface StepProps {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}

function Step({ label, glyph, disabled, onClick }: StepProps) {
  const bounceRef = usePressBounce(crispBounce);
  const zoomRef = useHoverSteps();
  return (
    <span ref={zoomRef} className={hoverZoomCrispWrapClass}>
      <button
        ref={bounceRef}
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-base leading-none text-ink-muted font-semibold hover:text-ink disabled:opacity-40",
          focusRingClass
        )}
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
    </span>
  );
}

interface RailProps {
  label: string;
  minutes: number;
  presets: readonly number[];
  max: number;
  running: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onSelect: (minutes: number) => void;
}

function Rail({ label, minutes, presets, max, running, onDecrease, onIncrease, onSelect }: RailProps) {
  const baseLabel = label.toUpperCase();
  return (
    <div
      role="group"
      aria-label={`${label} duration`}
      className="flex shrink-0 items-center gap-1"
    >
      <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
        {baseLabel}
      </span>
      <Step
        glyph="-"
        label={`Decrease ${label.toLowerCase()} time`}
        disabled={running || minutes <= 1}
        onClick={onDecrease}
      />
      {presets.map((preset) => (
        <Pill
          key={preset}
          label={preset}
          ariaLabel={`Set ${label.toLowerCase()} to ${preset} minutes`}
          active={preset === minutes}
          disabled={running}
          onClick={() => onSelect(preset)}
        />
      ))}
      <Step
        glyph="+"
        label={`Increase ${label.toLowerCase()} time`}
        disabled={running || minutes >= max}
        onClick={onIncrease}
      />
    </div>
  );
}

interface ResetButtonProps {
  size: "sm" | "lg";
  hold: number;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function ResetButton({
  size,
  hold,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
}: ResetButtonProps) {
  const bounceRef = usePressBounce(crispBounce);
  return (
    <span className={hoverZoomWrapClass}>
      <button
        ref={bounceRef}
        type="button"
        aria-label="Reset timer (hold to reset)"
        title="Hold to reset"
        aria-keyshortcuts="Enter"
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-white text-ink shadow-[0_1px_2px_rgba(120,110,80,0.10),0_6px_16px_-6px_rgba(120,110,80,0.22),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-ink/10 transition-colors duration-200 hover:ring-ink/25",
          size === "lg" ? "size-14" : "size-11",
          focusRingClass
        )}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <span
          aria-hidden="true"
          data-reset-fill
          className="pointer-events-none absolute inset-y-0 left-0 bg-[var(--accent-red)]/25 transition-none"
          style={{ width: `${Math.round(hold * 100)}%` }}
        />
        <RotateCcw className="relative size-[1.125rem]" />
      </button>
    </span>
  );
}

interface StartToggleProps {
  running: boolean;
  phase: FocusPhase;
  onToggle: () => void;
}

function StartToggle({ running, phase, onToggle }: StartToggleProps) {
  const phaseLabel = phase === "work" ? "Focus" : "Break";
  const bounceRef = usePressBounce(crispBounce);
  const zoomRef = useHoverSteps();
  return (
    <span ref={zoomRef} className={hoverZoomCrispWrapClass}>
      <button
        ref={bounceRef}
        type="button"
        aria-label={running ? `Pause ${phaseLabel}` : `Start ${phaseLabel}`}
        onClick={onToggle}
        className={cn(
          "pop-in inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white",
          "bg-[var(--accent-red)] shadow-[0_1px_2px_rgba(130,55,30,0.22),0_10px_24px_-8px_rgba(170,50,30,0.45),inset_0_1px_0_rgba(255,255,255,0.22)]",
          "transition-[box-shadow,filter] duration-300 ease-[var(--ease-spring)] hover:brightness-[1.04]",
          "touch-manipulation",
          focusRingClass
        )}
      >
        <span key={running ? "pause" : "play"} className="pop-in inline-flex">
          {running ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 translate-x-[1px]" />
          )}
        </span>
        {running ? `Pause ${phaseLabel}` : `Start ${phaseLabel}`}
      </button>
    </span>
  );
}

/**
 * The consolidated floating bottom dock (reformat.md). Context-driven:
 * idle shows the WORK rail, a Start + hold-to-reset pair, then the BREAK
 * rail, center-flanked; running collapses to exactly Pause + hold-to-reset.
 */
export function FocusControlDock({
  phase,
  running,
  work,
  rest,
  workMax,
  restMax,
  onWork,
  onRest,
  onToggle,
  resetHold,
  onHoldPointerDown,
  onHoldPointerUp,
  onHoldPointerCancel,
  onHoldKeyDown,
  onHoldKeyUp,
}: FocusControlDockProps) {
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 450, damping: 35, mass: 0.8 };

  const stateMotion = {
    initial: { opacity: 0, y: 10, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 6, scale: 0.96 },
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <AnimatePresence mode="wait" initial={false}>
        {running ? (
          <motion.div
            key="running"
            {...stateMotion}
            transition={transition}
            className="pointer-events-auto flex items-center gap-3"
          >
            <StartToggle running phase={phase} onToggle={onToggle} />
            <ResetButton
              size="lg"
              hold={resetHold}
              onPointerDown={onHoldPointerDown}
              onPointerUp={onHoldPointerUp}
              onPointerCancel={onHoldPointerCancel}
              onKeyDown={onHoldKeyDown}
              onKeyUp={onHoldKeyUp}
            />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            {...stateMotion}
            transition={transition}
            className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto touch-manipulation [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <Rail
              label="Work"
              minutes={work}
              presets={WORK_PILLS}
              max={workMax}
              running={running}
              onDecrease={() => onWork(Math.max(1, work - 1))}
              onIncrease={() => onWork(Math.min(workMax, work + 1))}
              onSelect={onWork}
            />
            <StartToggle running={false} phase={phase} onToggle={onToggle} />
            <ResetButton
              size="sm"
              hold={resetHold}
              onPointerDown={onHoldPointerDown}
              onPointerUp={onHoldPointerUp}
              onPointerCancel={onHoldPointerCancel}
              onKeyDown={onHoldKeyDown}
              onKeyUp={onHoldKeyUp}
            />
            <Rail
              label="Break"
              minutes={rest}
              presets={REST_PILLS}
              max={restMax}
              running={running}
              onDecrease={() => onRest(Math.max(1, rest - 1))}
              onIncrease={() => onRest(Math.min(restMax, rest + 1))}
              onSelect={onRest}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}