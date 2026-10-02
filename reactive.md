# Generative Ambient Sleeve & Reactive Visualizer — Specification & Implementation

> **SUPERSEDED** (2026-09-09, player revamp): the generative sleeve
> (`AmbientArtworkTile`), the reactive orb canvas (`ReactiveAudioCanvas`), and
> `stationThemes.ts` were **removed**. The player now shows the station dial above a
> deliberately empty reserved square (the "room") with no artwork; play state is
> signalled only by the VU meter fading in below the transport. Kep as archival
> history — do not revive without a new design discussion.

This specification defines the architecture, visual tokens, and component implementation for replacing missing album cover art with **Generative Ambient Mood Sleeves** and a real-time **Web Audio API Reactive Visualizer**.

---

## 1. Design Concept & Visual Primitives

Rather than treating the lack of cover art as a missing asset to be patched with an icon placeholder, the visual container functions as a **procedural tactile canvas**:

┌────────────────────────────────────────────────────────┐
│  FLOWSOUND ARCHIVE • RADIO LIVE                     ●  │
│                                                        │
│               ╭────────────────────────╮               │
│               │   ((   BREATHING   ))   │               │
│               │     REACTIVE ORB       │               │
│               ╰────────────────────────╯               │
│                                                        │
│                      CHILLHOP                          │
│             LO-FI RHYTHMS & SLOW BEATS                 │
│                                                        │
│  STEREO • 44.1 kHz                       STATION 04    │
└────────────────────────────────────────────────────────┘


1. **Procedural Gradient Surface:** Each station dynamically maps to a curated dual-tone ambient gradient reflecting its auditory tempo and mood.
2. **Glass Skeuomorphic Glaze:** A subtle linear specular highlight (`from-white/[0.12]` to `transparent`) layered over the surface mimics physical matte acrylic or vinyl sleeve packaging.
3. **Reactive Web Audio Orb:** An integrated HTML5 canvas visualizer connected to the browser's `AudioContext` and `AnalyserNode` that pulses smoothly in response to real-time low-end frequencies (kick drums and basslines).
4. **Swiss Archival Typography:** Monospace technical telemetry (`"STEREO 44.1kHz"`, `"STATION 04"`) provides structured visual balance without distraction.

---

## 2. Station Mood Palette Registry

| Station Identifier | Display Name | Visual Mood & Colorway | Tailwind Gradient Mapping |
| :--- | :--- | :--- | :--- |
| `focus` | Focus | Minimal Obsidian & Cobalt | `from-slate-900 via-sky-950 to-neutral-950` |
| `seasons` | Seasons | Earthy Terracotta & Clay | `from-stone-900 via-amber-950 to-neutral-950` |
| `ambient-drift` | Ambient Drift | Misty Jade & Soft Pine | `from-emerald-950 via-teal-950 to-neutral-950` |
| `soul` | Soul | Warm Ochre & Deep Sepia | `from-amber-900 via-stone-900 to-neutral-950` |
| `late-night` | Late Night | Midnight Violet & Indigo | `from-indigo-950 via-purple-950 to-neutral-950` |
| `funk` | Funk | Electric Coral & Mulberry | `from-rose-950 via-pink-950 to-neutral-950` |
| `jazz-lounge` | Jazz Lounge | Smoked Brass & Burgundy | `from-amber-950 via-red-950 to-neutral-950` |
| `chillhop` | Chillhop | Dusty Peach & Warm Sand | `from-orange-950 via-stone-900 to-neutral-950` |
| `asian` | Asian Lo-Fi | Bamboo Forest & Mist | `from-teal-950 via-emerald-950 to-neutral-950` |
| `hybrid` | Hybrid | Deep Neon Cyan & Charcoal | `from-cyan-950 via-slate-900 to-neutral-950` |

---

## 3. Directory Layout

components/player/
├── AmbientArtworkTile.tsx         # Composite sleeve container
├── ReactiveAudioCanvas.tsx        # Real-time Web Audio API visualizer
└── stationThemes.ts               # Station color and typography registry


---

## 4. Component Implementation

### Station Theme Registry (`components/player/stationThemes.ts`)

```typescript
export interface StationThemeDefinition {
  readonly stationIdentifier: string;
  readonly displayTitle: string;
  readonly subtitleDescription: string;
  readonly gradientClass: string;
  readonly accentHexCode: string;
  readonly archiveStationCode: string;
}

export const STATION_THEME_MAP: Record<string, StationThemeDefinition> = {
  focus: {
    stationIdentifier: "focus",
    displayTitle: "Focus",
    subtitleDescription: "Deep Work Sequence",
    gradientClass: "from-slate-900 via-sky-950 to-neutral-950",
    accentHexCode: "#38BDF8",
    archiveStationCode: "ARCHIVE-01",
  },
  seasons: {
    stationIdentifier: "seasons",
    displayTitle: "Seasons",
    subtitleDescription: "Ambient Seasonal Shifts",
    gradientClass: "from-stone-900 via-amber-950 to-neutral-950",
    accentHexCode: "#F59E0B",
    archiveStationCode: "ARCHIVE-02",
  },
  "ambient-drift": {
    stationIdentifier: "ambient-drift",
    displayTitle: "Ambient Drift",
    subtitleDescription: "Zero-Gravity Soundscapes",
    gradientClass: "from-emerald-950 via-teal-950 to-neutral-950",
    accentHexCode: "#10B981",
    archiveStationCode: "ARCHIVE-03",
  },
  soul: {
    stationIdentifier: "soul",
    displayTitle: "Soul",
    subtitleDescription: "Warm Analog Textures",
    gradientClass: "from-amber-900 via-stone-900 to-neutral-950",
    accentHexCode: "#D97706",
    archiveStationCode: "ARCHIVE-04",
  },
  "late-night": {
    stationIdentifier: "late-night",
    displayTitle: "Late Night",
    subtitleDescription: "Midnight Solitude",
    gradientClass: "from-indigo-950 via-purple-950 to-neutral-950",
    accentHexCode: "#818CF8",
    archiveStationCode: "ARCHIVE-05",
  },
  funk: {
    stationIdentifier: "funk",
    displayTitle: "Funk",
    subtitleDescription: "Rhythmic Groove & Pulse",
    gradientClass: "from-rose-950 via-pink-950 to-neutral-950",
    accentHexCode: "#F43F5E",
    archiveStationCode: "ARCHIVE-06",
  },
  "jazz-lounge": {
    stationIdentifier: "jazz-lounge",
    displayTitle: "Jazz Lounge",
    subtitleDescription: "Subtle Chords & Brushes",
    gradientClass: "from-amber-950 via-red-950 to-neutral-950",
    accentHexCode: "#FB923C",
    archiveStationCode: "ARCHIVE-07",
  },
  chillhop: {
    stationIdentifier: "chillhop",
    displayTitle: "Chillhop",
    subtitleDescription: "Downtempo Beats",
    gradientClass: "from-orange-950 via-stone-900 to-neutral-950",
    accentHexCode: "#F97316",
    archiveStationCode: "ARCHIVE-08",
  },
  asian: {
    stationIdentifier: "asian",
    displayTitle: "Asian Lo-Fi",
    subtitleDescription: "Traditional & Downtempo",
    gradientClass: "from-teal-950 via-emerald-950 to-neutral-950",
    accentHexCode: "#2DD4BF",
    archiveStationCode: "ARCHIVE-09",
  },
  hybrid: {
    stationIdentifier: "hybrid",
    displayTitle: "Hybrid",
    subtitleDescription: "Cinematic Electronics",
    gradientClass: "from-cyan-950 via-slate-900 to-neutral-950",
    accentHexCode: "#06B6D4",
    archiveStationCode: "ARCHIVE-10",
  },
};
Reactive Audio Canvas (components/player/ReactiveAudioCanvas.tsx)
TypeScript
"use client";

import React, { useEffect, useRef } from "react";

interface ReactiveAudioCanvasProps {
  readonly audioAnalyserNode: AnalyserNode | null;
  readonly isAudioPlaying: boolean;
  readonly glowColorHex: string;
}

export function ReactiveAudioCanvas({
  audioAnalyserNode,
  isAudioPlaying,
  glowColorHex,
}: ReactiveAudioCanvasProps) {
  const canvasElementReference = useRef<HTMLCanvasElement null |>(null);
  const animationFrameIdentifierReference = useRef<number | null>(null);

  useEffect(() => {
    const targetCanvas = canvasElementReference.current;
    if (!targetCanvas) return;

    const renderingContext = targetCanvas.getContext("2d");
    if (!renderingContext) return;

    const frequencyDataBuffer = new Uint8Array(
      audioAnalyserNode ? audioAnalyserNode.frequencyBinCount : 32
    );

    let smoothOrbRadius = 42;

    const renderVisualizationFrame = () => {
      const canvasWidth = targetCanvas.width;
      const canvasHeight = targetCanvas.height;
      const centerXCoordinate = canvasWidth / 2;
      const centerYCoordinate = canvasHeight / 2;

      renderingContext.clearRect(0, 0, canvasWidth, canvasHeight);

      let targetExpansionRadius = 42;

      if (audioAnalyserNode && isAudioPlaying) {
        audioAnalyserNode.getByteFrequencyData(frequencyDataBuffer);

        // Sample low frequencies (bins 0-6: kicks, 808s, basslines)
        let lowFrequencySum = 0;
        const lowFrequencyBinsCount = 6;
        for (let index = 0; index < lowFrequencyBinsCount; index += 1) {
          lowFrequencySum += frequencyDataBuffer[index];
        }
        const lowFrequencyAverage = lowFrequencySum / lowFrequencyBinsCount;
        targetExpansionRadius = 42 + (lowFrequencyAverage / 255) * 28;
      } else {
        // Idle ambient breathing when paused
        const idleBreathingOffset = Math.sin(Date.now() / 600) * 3;
        targetExpansionRadius = 42 + idleBreathingOffset;
      }

      // Smooth interpolation (lerp) for fluid motion
      smoothOrbRadius += (targetExpansionRadius - smoothOrbRadius) * 0.12;

      // Draw diffuse ambient glow halo
      const radialGradient = renderingContext.createRadialGradient(
        centerXCoordinate,
        centerYCoordinate,
        smoothOrbRadius * 0.2,
        centerXCoordinate,
        centerYCoordinate,
        smoothOrbRadius * 1.8
      );
      radialGradient.addColorStop(0, `${glowColorHex}66`);
      radialGradient.addColorStop(0.6, `${glowColorHex}1A`);
      radialGradient.addColorStop(1, "transparent");

      renderingContext.fillStyle = radialGradient;
      renderingContext.beginPath();
      renderingContext.arc(
        centerXCoordinate,
        centerYCoordinate,
        smoothOrbRadius * 1.8,
        0,
        Math.PI * 2
      );
      renderingContext.fill();

      // Draw primary glowing core
      renderingContext.beginPath();
      renderingContext.arc(
        centerXCoordinate,
        centerYCoordinate,
        smoothOrbRadius,
        0,
        Math.PI * 2
      );
      renderingContext.fillStyle = `${glowColorHex}CC`;
      renderingContext.shadowColor = glowColorHex;
      renderingContext.shadowBlur = 18;
      renderingContext.fill();

      animationFrameIdentifierReference.current = requestAnimationFrame(
        renderVisualizationFrame
      );
    };

    renderVisualizationFrame();

    return () => {
      if (animationFrameIdentifierReference.current !== null) {
        cancelAnimationFrame(animationFrameIdentifierReference.current);
      }
    };
  }, [audioAnalyserNode, isAudioPlaying, glowColorHex]);

  return (
    <canvas
      ref={canvasElementReference}
      width={180}
      height={180}
      className="w-36 h-36 select-none pointer-events-none"
      aria-hidden="true"
    />
  );
}
Ambient Artwork Tile (components/player/AmbientArtworkTile.tsx)
TypeScript
"use client";

import React from "react";
import { ReactiveAudioCanvas } from "./ReactiveAudioCanvas";
import { STATION_THEME_MAP } from "./stationThemes";

interface AmbientArtworkTileProps {
  readonly currentStationIdentifier: string;
  readonly isAudioPlaying: boolean;
  readonly audioAnalyserNode: AnalyserNode | null;
}

export function AmbientArtworkTile({
  currentStationIdentifier,
  isAudioPlaying,
  audioAnalyserNode,
}: AmbientArtworkTileProps) {
  const activeTheme =
    STATION_THEME_MAP[currentStationIdentifier] ?? STATION_THEME_MAP.focus;

  return (
    <div
      role="img"
      aria-label={`${activeTheme.displayTitle} channel sleeve: ${activeTheme.subtitleDescription}`}
      className={`
        relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden select-none
        bg-gradient-to-br ${activeTheme.gradientClass}
        border border-white/10 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.5),0_0_1px_1px_rgba(255,255,255,0.06)]
        flex flex-col justify-between p-6 transition-all duration-700 ease-out
      `}
    >
      {/* Specular Glaze Highlight Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.12] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Telemetry Header */}
      <div className="relative z-10 flex items-center justify-between font-mono text-[10px] tracking-widest text-white/50 uppercase">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              isAudioPlaying ? "bg-emerald-400 animate-pulse" : "bg-white/20"
            }`}
          />
          <span>Radio Live</span>
        </span>
        <span className="tabular-nums">{activeTheme.archiveStationCode}</span>
      </div>

      {/* Optical Center: Reactive Audio Orb */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <ReactiveAudioCanvas audioAnalyserNode="{audioAnalyserNode}" glowColorHex="{activeTheme.accentHexCode}" isAudioPlaying="{isAudioPlaying}"/>
      </div>

      {/* Bottom Metadata Footer */}
      <div className="relative z-10 flex items-end justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white/95 leading-none">
            {activeTheme.displayTitle}
          </h2>
          <p className="text-[11px] font-medium text-white/40 tracking-wide uppercase mt-1">
            {activeTheme.subtitleDescription}
          </p>
        </div>

        <div className="text-right font-mono text-[9px] tracking-widest text-white/40 uppercase">
          <p>Stereo</p>
          <p className="tabular-nums">44.1 kHz</p>
        </div>
      </div>
    </div>
  );
}
5. Web Interface Guidelines Compliance Matrix
Zero Missing Asset Fallback: Eliminates broken image icons and placeholder art in favor of pure, programmatic styling.

Low CPU/GPU Overhead: The visualization loop runs on a single HTML5 <canvas> using requestAnimationFrame, bounding frame renders to 60fps and suspending render work when unmounted.

Layout Stability (Zero CLS): Tile geometry is strictly locked with responsive tailwind scales (w-64 h-64 sm:w-72 sm:h-72), ensuring no layout shift occurs across station swaps.

Accessible Imagery: The container implements role="img" accompanied by an explicit aria-label describing the active channel and audio state.
