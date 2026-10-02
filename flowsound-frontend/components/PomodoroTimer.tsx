"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseAsInteger, parseAsStringEnum, useQueryStates } from "nuqs";
import { FocusClockDisplay, type FocusPhase } from "@/components/focus/FocusClockDisplay";
import { FocusControlDock } from "@/components/focus/FocusControlDock";

const MIN_MINUTES = 1;
const MAX_WORK = 180;
const MAX_REST = 60;
const RESET_HOLD_MS = 750;

const timerConfig = {
  work: parseAsInteger.withDefault(25),
  rest: parseAsInteger.withDefault(5),
  phase: parseAsStringEnum<FocusPhase>(["work", "rest"]).withDefault("work"),
  endsAt: parseAsInteger.withDefault(0),
  running: parseAsInteger.withDefault(0),
  done: parseAsInteger.withDefault(0),
  left: parseAsInteger.withDefault(0),
};

function clampMinutes(value: number, max: number): number {
  return Math.min(max, Math.max(MIN_MINUTES, Math.round(value) || MIN_MINUTES));
}

export function PomodoroTimer() {
  const [state, setState] = useQueryStates(timerConfig);
  const { work, rest, phase, endsAt, running, left } = state;
  const runningBool = running === 1;

  // URL input is untrusted: clamp every duration so a crafted query can never
  // produce NaN/negative/infinite timers (e.g. ?work=0, ?work=9999, ?left=1e12).
  const safeWork = clampMinutes(work, MAX_WORK);
  const safeRest = clampMinutes(rest, MAX_REST);
  const phaseDurationMs = (phase === "work" ? safeWork : safeRest) * 60000;

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!runningBool) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [runningBool]);

  // A stale URL like ?running=1&endsAt=0 would otherwise freeze a "running"
  // timer forever; normalize it back to a paused, ready-to-start phase.
  useEffect(() => {
    if (running === 1 && (endsAt ?? 0) <= 0) {
      setState((prev) => {
        const isWork = prev.phase === "work";
        const durationMs = (isWork
          ? clampMinutes(prev.work, MAX_WORK)
          : clampMinutes(prev.rest, MAX_REST)) * 60000;
        return { ...prev, running: 0, endsAt: 0, left: durationMs };
      });
    }
  }, [running, endsAt, setState]);

  const rawEndsAt = Math.max(0, Math.round(endsAt || 0));
  const cappedEndsAt = Math.min(rawEndsAt, now + phaseDurationMs);
  const rawLeft = Math.max(0, Math.round(left || 0));
  const cappedLeft = Math.min(rawLeft, phaseDurationMs);
  const remainingMs = runningBool
    ? cappedEndsAt > 0
      ? Math.max(0, cappedEndsAt - now)
      : 0
    : cappedLeft > 0
      ? cappedLeft
      : phaseDurationMs;

  const advance = useCallback(() => {
    const base = Date.now();
    setState((prev) => {
      const isWork = prev.phase === "work";
      const nextDurationMs = (isWork
        ? clampMinutes(prev.rest, MAX_REST)
        : clampMinutes(prev.work, MAX_WORK)) * 60000;
      if (prev.running === 1) {
        return {
          ...prev,
          phase: isWork ? "rest" : "work",
          endsAt: base + nextDurationMs,
          left: 0,
          done: isWork ? prev.done + 1 : prev.done,
        };
      }
      return {
        ...prev,
        phase: isWork ? "rest" : "work",
        endsAt: 0,
        left: nextDurationMs,
        done: isWork ? prev.done + 1 : prev.done,
      };
    });
  }, [setState]);

  useEffect(() => {
    if (!runningBool || endsAt <= 0) return;
    if (Date.now() < endsAt) return;
    advance();
  }, [runningBool, endsAt, now, advance]);

  const toggle = useCallback(() => {
    const base = Date.now();
    setState((prev) => {
      const isWork = prev.phase === "work";
      const durationMs = (isWork
        ? clampMinutes(prev.work, MAX_WORK)
        : clampMinutes(prev.rest, MAX_REST)) * 60000;
      if (prev.running === 1) {
        const remainingMs =
          prev.endsAt > 0 ? Math.max(0, prev.endsAt - base) : durationMs;
        if (remainingMs <= 0) {
          // The phase ended right as the user hit pause: advance to the next
          // phase instead of snapping back to a full bar.
          const nextDurationMs = (isWork
            ? clampMinutes(prev.rest, MAX_REST)
            : clampMinutes(prev.work, MAX_WORK)) * 60000;
          return {
            ...prev,
            phase: isWork ? "rest" : "work",
            endsAt: 0,
            left: nextDurationMs,
            done: isWork ? prev.done + 1 : prev.done,
          };
        }
        return { ...prev, running: 0, endsAt: 0, left: remainingMs };
      }
      const remainingMs =
        prev.left > 0 ? Math.min(prev.left, durationMs) : durationMs;
      return { ...prev, running: 1, endsAt: base + remainingMs, left: 0 };
    });
    setNow(base);
  }, [setState]);

  const reset = useCallback(() => {
    setState({
      work,
      rest,
      phase: "work",
      endsAt: 0,
      left: 0,
      running: 0,
      done: 0,
    });
    setNow(Date.now());
  }, [setState, work, rest]);

  const [resetHold, setResetHold] = useState(0);
  const holdProgressRef = useRef(0);
  const holdRafRef = useRef<number | null>(null);
  const holdStartRef = useRef(0);
  const holdActiveRef = useRef(false);

  const stopHold = useCallback(
    (commit: boolean) => {
      holdActiveRef.current = false;
      if (holdRafRef.current !== null) {
        cancelAnimationFrame(holdRafRef.current);
        holdRafRef.current = null;
      }
      const shouldReset = commit && holdProgressRef.current >= 1;
      holdProgressRef.current = 0;
      setResetHold(0);
      if (shouldReset) reset();
    },
    [reset]
  );

  const startHold = useCallback(() => {
    if (holdActiveRef.current) return;
    holdActiveRef.current = true;
    holdStartRef.current = performance.now();
    const tick = (t: number) => {
      if (!holdActiveRef.current) return;
      const next = Math.min(1, (t - holdStartRef.current) / RESET_HOLD_MS);
      holdProgressRef.current = next;
      setResetHold(next);
      if (next >= 1) {
        stopHold(true);
        return;
      }
      holdRafRef.current = requestAnimationFrame(tick);
    };
    holdRafRef.current = requestAnimationFrame(tick);
  }, [stopHold]);

  const cancelHold = useCallback(() => stopHold(false), [stopHold]);

  const handleHoldPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      startHold();
    },
    [startHold]
  );

  const handleHoldPointerUp = useCallback(() => stopHold(true), [stopHold]);

  const handleHoldKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
        event.preventDefault();
        startHold();
      }
    },
    [startHold]
  );

  const handleHoldKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") stopHold(true);
    },
    [stopHold]
  );

  const updateWork = useCallback(
    (minutes: number) => {
      setState((prev) => {
        const workMinutes = clampMinutes(minutes, MAX_WORK);
        if (prev.phase === "work" && prev.running === 0) {
          return { ...prev, work: workMinutes, endsAt: 0, left: workMinutes * 60000 };
        }
        return { ...prev, work: workMinutes };
      });
    },
    [setState]
  );

  const updateRest = useCallback(
    (minutes: number) => {
      setState((prev) => {
        const restMinutes = clampMinutes(minutes, MAX_REST);
        if (prev.phase === "rest" && prev.running === 0) {
          return { ...prev, rest: restMinutes, endsAt: 0, left: restMinutes * 60000 };
        }
        return { ...prev, rest: restMinutes };
      });
    },
    [setState]
  );

  const phaseLabel = phase === "work" ? "Focus" : "Break";

  return (
    <div className="m-auto flex min-h-full w-full flex-col items-center justify-center px-4 pb-36 pt-24 select-none sm:px-6">
      <FocusClockDisplay
        phaseLabel={phaseLabel}
        seconds={remainingMs / 1000}
        running={runningBool}
      />
      <FocusControlDock
        phase={phase}
        running={runningBool}
        work={work}
        rest={rest}
        workMax={MAX_WORK}
        restMax={MAX_REST}
        onWork={updateWork}
        onRest={updateRest}
        onToggle={toggle}
        resetHold={resetHold}
        onHoldPointerDown={handleHoldPointerDown}
        onHoldPointerUp={handleHoldPointerUp}
        onHoldPointerCancel={cancelHold}
        onHoldKeyDown={handleHoldKeyDown}
        onHoldKeyUp={handleHoldKeyUp}
      />
    </div>
  );
}