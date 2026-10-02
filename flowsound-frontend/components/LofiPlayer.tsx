"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import {
  StationInfiniteDial,
  type StationItem,
} from "@/components/player/StationInfiniteDial";
import {
  orbColorwayFor,
} from "@/components/player/playerOrbColors";
import { Button } from "@/components/ui/button";
import { usePressBounce } from "@/hooks/usePressBounce";
import { hoverZoomClass } from "@/lib/pressSurface";
import { ensureAudioContextRunning, initializeWebAudioPipeline } from "@/lib/audioContextManager";
import { API_BASE, jsonFetcher } from "@/lib/api";
import { LoFiTrack, MusicCategory } from "@/types/lofi";

// three.js + the orb shader load on the FIRST play only (deferred), so the
// idle app-load bytes never change — the watched page stays lean.
const DynamicOrb = dynamic(
  () =>
    import("@/components/player/FluidAudioOrb").then(
      (module) => module.FluidAudioOrb
    ),
  { ssr: false }
);

// Warm accent per category, in the paper deck's oklch-native palette. These
// replace the old album-art accent: each mood carries its own hue while staying
// readable against cream.
const CATEGORY_ACCENTS: Record<string, string> = {
  activities: "oklch(0.55 0.12 45)", // amber — focus & routines
  "ambient-lofi": "oklch(0.62 0.07 230)", // haze blue — drift
  "asian-lofi": "oklch(0.55 0.09 150)", // moss — zen calm
  chillhop: "oklch(0.6 0.12 88)", // honey — cozy beats
  "funk-soul": "oklch(0.55 0.19 350)", // plum — retro bounce
  hybrid: "oklch(0.6 0.13 300)", // violet — cinematic
  jazzhop: "oklch(0.5 0.14 24)", // ember — jazz rooms
  "late-night": "oklch(0.48 0.15 285)", // indigo — after hours
  "seasonal-weather": "oklch(0.6 0.12 205)", // rain — sky & weather
  "soul-rnb": "oklch(0.52 0.16 8)", // oxblood — warm rooms
};

const CATEGORY_ORDER = [
  "activities",
  "seasonal-weather",
  "ambient-lofi",
  "soul-rnb",
  "late-night",
  "funk-soul",
  "jazzhop",
  "chillhop",
  "asian-lofi",
  "hybrid",
];

export function LofiPlayer({ active }: { readonly active: boolean }) {
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<LoFiTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [everPlayedOrb, setEverPlayedOrb] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioVisualRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playingRef = useRef(false);
  const bounceRef = usePressBounce(0.9);
  const prevBounceRef = usePressBounce(0.9);
  const nextBounceRef = usePressBounce(0.9);

  // Load the category list once.
  useEffect(() => {
    let alive = true;
    jsonFetcher<MusicCategory[]>(`${API_BASE}/api/music/categories`)
      .then((cats) => {
        if (!alive) return;
        const sorted = cats
          .slice()
          .sort(
            (a, b) =>
              CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id) ||
              a.name.localeCompare(b.name)
          );
        setCategories(sorted);
        if (sorted[0]) setCategory(sorted[0].id);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Fetch a fresh shuffled playlist when the category changes.
  useEffect(() => {
    if (!category) return;
    let alive = true;
    jsonFetcher<LoFiTrack[]>(`${API_BASE}/api/music/playlist/${category}`)
      .then((tracks) => {
        if (alive) setPlaylist(tracks);
      })
      .catch(() => {
        if (alive) setPlaylist([]);
      });
    return () => {
      alive = false;
    };
  }, [category]);

  // Keep the intent ref in step with the visible play state so the src-binding
  // effect below can read it without depending on `playing` (which would
  // reload the track on every play/pause flip).
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Point both audio elements at the current track — the VISIBLE element plays
  // straight to the device (native element output: audible + the tab's speaker
  // icon), while the hidden MUTED element feeds the shared Web Audio graph so
  // the orb keeps its bass warble without ever owning the audible path. When
  // the source changes we only autoplay if the user had playback running; a
  // play/pause flip never touches the src.
  useEffect(() => {
    const audio = audioRef.current;
    const visual = audioVisualRef.current;
    if (!audio || playlist.length === 0) return;
    const track = playlist[Math.min(index, playlist.length - 1)];
    const url = `${API_BASE}/api/music/stream/${track.category}/${track.filename}`;
    audio.src = url;
    if (visual && visual.src !== url) visual.src = url;
    if (playingRef.current) {
      const playPair = async () => {
        try {
          await audio.play();
          void visual?.play().catch(() => undefined);
        } catch {
          setPlaying(false);
          void visual?.pause();
        }
      };
      void playPair();
    }
  }, [playlist, index]);

  // Auto-advance the queue when a track ends.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || playlist.length === 0) return;
    const next = () => setIndex((i) => (i + 1) % playlist.length);
    audio.addEventListener("ended", next);
    return () => audio.removeEventListener("ended", next);
  }, [playlist.length]);

  const selectCategory = (id: string) => {
    if (id === category) return;
    audioRef.current?.pause();
    audioVisualRef.current?.pause();
    setCategory(id);
    setIndex(0);
    setPlaying(false);
    setPlaylist([]);
  };

  // Track-title letter change (crossfade + slight rise). Reduced motion drops
  // both the offset and the duration so the swap is instant and invisible.
  const reducedMotionSwaps = useReducedMotion();
  const lettersTransition = reducedMotionSwaps
    ? { duration: 0 }
    : { duration: 0.22, ease: "easeOut" as const };
  const lettersMotion = {
    initial: { opacity: 0, y: reducedMotionSwaps ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reducedMotionSwaps ? 0 : -8 },
  };
  const metaMotion = {
    initial: { opacity: 0, y: reducedMotionSwaps ? 0 : 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reducedMotionSwaps ? 0 : -4 },
  };

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    const visual = audioVisualRef.current;
    if (!audio || playlist.length === 0) return;
    if (audio.paused) {
      // First play gesture lazily wires the shared Web Audio pipeline (orb.md §5)
      // to the hidden VISUAL element only — the audible track stays native to the
      // <audio> element (Chrome tab speaker icon + guaranteeably-routable audio).
      if (!everPlayedOrb) {
        const graph = visual ? initializeWebAudioPipeline(visual) : null;
        if (graph) {
          analyserRef.current = graph.analyserNode;
          audioContextRef.current = graph.audioContext;
        }
        setEverPlayedOrb(true);
      }
      void (async () => {
        // Resume-before-play: the browser can suspend the shared context (hidden
        // tab / sleep) and stop the wobble — wake it before every press; a fresh
        // in-gesture context is already running, so first play isn't slowed.
        if (audioContextRef.current) {
          await ensureAudioContextRunning(audioContextRef.current);
        }
        try {
          await audio.play();
          void visual?.play().catch(() => undefined);
          setPlaying(true);
        } catch {
          setPlaying(false);
          void visual?.pause();
        }
      })();
    } else {
      audio.pause();
      void visual?.pause();
      setPlaying(false);
    }
  }, [playlist.length, everPlayedOrb]);

  const skip = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + playlist.length) % playlist.length);
    },
    [playlist.length]
  );

  const track = playlist[Math.min(index, playlist.length - 1)];
  const accent = category ? CATEGORY_ACCENTS[category] ?? "var(--ink)" : "var(--ink)";
  const activeCategory = categories.find((c) => c.id === category);
  const orbColors = orbColorwayFor(category);

  const dialStations: StationItem[] = categories.map((c) => ({
    id: c.id,
    name: c.name.replace(/,.*$/, "").replace(/ & .*/, ""),
  }));
  const activeIndex = Math.max(
    0,
    dialStations.findIndex((s) => s.id === category)
  );
  const handleSelectStation = (stationIndex: number) => {
    const station = dialStations[stationIndex];
    if (station) selectCategory(station.id);
  };

  if (categories.length === 0) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading lo-fi library"
        className="m-auto flex min-h-full w-full flex-col items-center gap-6 px-6 py-20"
      >
        <div className="flex w-full flex-col items-center gap-3">
          <div className="h-6 w-full rounded-full bg-ink/[0.07]" />
          <div className="mt-1 aspect-square w-[min(72vw,300px)] rounded-[16px] bg-ink/[0.05] lg:w-[min(30vh,340px)]" />
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <div className="h-10 w-3/4 rounded-full bg-ink/[0.07]" />
          <div className="h-5 w-1/2 rounded-full bg-ink/[0.07]" />
        </div>
      </div>
    );
  }

  return (
    <article
      aria-label="Lo-fi stream"
      style={{ "--accent-now": accent } as CSSProperties}
      className="m-auto flex min-h-full w-full max-w-3xl flex-col items-center gap-5 px-4 py-20 select-none sm:px-6"
    >
      {/* Infinite station dial (carousel.md) + the reserved room */}
      <div className="flex w-full flex-col items-center gap-3">
        <StationInfiniteDial
          stations={dialStations}
          activeStationIndex={activeIndex}
          onSelectStation={handleSelectStation}
        />

        {/* The room: a reserved square that stays deliberately empty until music plays,
            then hosts the zero-presence Fluid Audio Orb (orb.md) at ~65%. */}
        <div
          data-player-room
          aria-hidden="true"
          className="mt-1 flex aspect-square w-[min(72vw,300px)] items-center justify-center lg:w-[min(30vh,340px)]"
        >
          {everPlayedOrb && (
            <DynamicOrb
              isAudioPlaying={playing}
              audioAnalyserNode={analyserRef.current}
              primaryColorHex={orbColors.primary}
              secondaryColorHex={orbColors.secondary}
              isPaneActive={active}
              className="w-[min(47vw,195px)] lg:w-[min(20vh,220px)]"
            />
          )}
        </div>
      </div>

      {/* Track info + transport */}
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <div className="relative mt-3 h-[32px] w-full sm:h-[39px]">
          <AnimatePresence initial={false}>
            <motion.h2
              key={track ? track.filename : `empty-${activeCategory?.id ?? "none"}`}
              translate="no"
              title={track?.title}
              initial={lettersMotion.initial}
              animate={lettersMotion.animate}
              exit={lettersMotion.exit}
              transition={lettersTransition}
              className="absolute inset-x-0 top-0 truncate font-display text-3xl font-semibold leading-[1.06] tracking-[-0.01em] text-ink sm:text-4xl"
            >
              {track
                ? track.title
                : `${activeCategory?.name ?? ""} · ${activeCategory?.count ?? 0} tracks`}
            </motion.h2>
          </AnimatePresence>
        </div>
        <div className="relative mt-1 h-5 w-full">
          <AnimatePresence initial={false}>
            <motion.p
              key={activeCategory?.id ?? "none"}
              initial={metaMotion.initial}
              animate={metaMotion.animate}
              exit={metaMotion.exit}
              transition={lettersTransition}
              className="absolute inset-x-0 top-0 text-[11px] uppercase tracking-[0.14em] text-ink-faint"
            >
              {activeCategory?.name ?? ""}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex rounded-full border border-ink/10 bg-white p-2 shadow-[0_1px_3px_rgba(10,10,10,0.05)]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Previous track"
              onClick={() => skip(-1)}
              disabled={!track}
              ref={prevBounceRef}
              className={hoverZoomClass}
            >
              <SkipBack className="size-5" />
            </Button>

            <Button
              size="icon-lg"
              aria-label={playing ? "Pause" : "Play"}
              onClick={toggle}
              disabled={!track}
              className={`h-14 w-14 rounded-full bg-ink text-paper shadow-[0_1px_3px_rgba(10,10,10,0.18),0_10px_24px_-10px_rgba(10,10,10,0.35)] hover:bg-ink/85 ${hoverZoomClass}`}
              ref={bounceRef}
            >
              <span key={playing ? "pause" : "play"} className="pop-in inline-flex">
                {playing ? (
                  <Pause className="size-6" />
                ) : (
                  <Play className="size-6 translate-x-px" />
                )}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Next track"
              onClick={() => skip(1)}
              disabled={!track}
              ref={nextBounceRef}
              className={hoverZoomClass}
            >
              <SkipForward className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" />
      {/* Muted twin that feeds the orb's analyser — never the audible path. */}
      <audio
        ref={audioVisualRef}
        aria-hidden="true"
        muted
        preload="metadata"
        className="hidden"
      />
    </article>
  );
}
