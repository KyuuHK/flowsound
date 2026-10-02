# FlowSound — Technical Specification & Implementation Architecture

FlowSound is a contextual productivity audio dashboard combining ambient Spotify playback monitoring, an integrated Pomodoro focus engine, and dynamic glassmorphism UI adaptation. The system decouples a Python/Flask data and signal service from a Next.js (App Router) interface that strictly adheres to the Web Interface Guidelines.

> **Status:** This document describes the *target* architecture. The current running codebase (FastAPI + uvicorn serving a static HTML/CSS/JS frontend) is scheduled for migration to the Flask + Next.js split described below.

---

## 1. System Architecture & Topology

              ┌────────────────────────────────────────┐
              │          Spotify Web API               │
              └───────────────▲────────────────────────┘
                              │ OAuth 2.0 / REST
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ BACKEND SERVICE (Flask Engine)                                           │
│  - Port: 5000 (Loopback: http://127.0.0.1:5000)                          │
│  - Session Engine & Spotipy Manager (OAuth Token Management)             │
│  - Color Extraction Pipeline (colorgram.py + In-Memory Buffer)           │
│  - JSON Serialization / Endpoints                                        │
└─────────────────────────────────▲────────────────────────────────────────┘
                                  │ HTTP REST (CORS Restricted)
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ FRONTEND APPLICATION (Next.js App Router)                                │
│  - Port: 3000 (Loopback: http://127.0.0.1:3000)                          │
│  - Tailwind CSS Glassmorphism Engine (backdrop-filter, layered shadows)  │
│  - SWR / React Query Polling Layer (Optimistic Reconciliation)           │
│  - Autonomous Pomodoro State Machine (Tabular Nums, Web-safe timer)       │
│  - WAI-ARIA Accessible Control Suite                                     │
└──────────────────────────────────────────────────────────────────────────┘

---

## 2. Technology Stack

### Backend Core
* **Runtime:** Python 3.12+ (Venv isolated)
* **Framework:** Flask 3.x
* **CORS Handling:** `flask-cors`
* **Spotify Client:** `spotipy` (OAuth2 Authorization Code flow)
* **Color Extraction:** `colorgram.py`, `Pillow`, `requests`

### Frontend Core
* **Framework:** Next.js (App Router, React 19 / Server & Client Components)
* **Styling:** Tailwind CSS v4, dynamic CSS variables (`--ambient-hue`)
* **State Management:** URL state persistence via `nuqs`, custom timer state
* **Accessibility:** Radix UI Primitives / native semantic HTML, WAI-ARIA 1.2 compliant
* **Typography:** Geist Sans & Geist Mono (`font-variant-numeric: tabular-nums`)

---

## 3. Backend Implementation Spec (Flask)

### 3.1 Directory Hierarchy

```
flowsound-backend/
├── app.py
├── config.py
├── requirements.txt
├── services/
│   ├── __init__.py
│   ├── color_extractor.py
│   └── spotify_service.py
└── utils/
    └── response_helpers.py
```

### 3.2 Dependency Manifest (`requirements.txt`)

```text
flask>=3.0.0
flask-cors>=4.0.0
spotipy>=2.23.0
colorgram.py>=1.2.0
pillow>=10.2.0
requests>=2.31.0
python-dotenv>=1.0.1
```

### 3.3 Spotify Service (`services/spotify_service.py`)

```python
import os
from typing import Any, Dict, Optional

import spotipy
from spotipy.oauth2 import SpotifyOAuth


class SpotifyServiceManager:
    def __init__(self) -> None:
        self.client_id: str = os.getenv("SPOTIFY_CLIENT_ID", "")
        self.client_secret: str = os.getenv("SPOTIFY_CLIENT_SECRET", "")
        # Loopback explicit IP literal required by Spotify Developer Policy.
        self.redirect_uri: str = os.getenv(
            "SPOTIFY_REDIRECT_URI", "http://127.0.0.1:5000/api/auth/callback"
        )
        self.scope: str = (
            "user-read-playback-state "
            "user-modify-playback-state "
            "user-read-currently-playing"
        )
        self.oauth_manager: SpotifyOAuth = self._initialize_oauth_manager()

    def _initialize_oauth_manager(self) -> SpotifyOAuth:
        return SpotifyOAuth(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=self.redirect_uri,
            scope=self.scope,
            cache_path=".spotify_token_cache",
            show_dialog=False,
        )

    def get_authorization_url(self) -> str:
        return self.oauth_manager.get_authorize_url()

    def request_access_token(self, authorization_code: str) -> Dict[str, Any]:
        return self.oauth_manager.get_access_token(
            authorization_code, as_dict=True
        )

    def get_spotify_client(self) -> Optional[spotipy.Spotify]:
        token_info: Optional[Dict[str, Any]] = self.oauth_manager.get_cached_token()
        if not token_info:
            return None
        if self.oauth_manager.is_token_expired(token_info):
            token_info = self.oauth_manager.refresh_access_token(
                token_info["refresh_token"]
            )
        return spotipy.Spotify(auth=token_info["access_token"])

    def fetch_current_playback(self) -> Optional[Dict[str, Any]]:
        spotify_client: Optional[spotipy.Spotify] = self.get_spotify_client()
        if not spotify_client:
            return None

        playback_state: Optional[Dict[str, Any]] = spotify_client.current_playback()
        if not playback_state or not playback_state.get("item"):
            return None

        track_item = playback_state["item"]
        album_images = track_item.get("album", {}).get("images", [])
        album_cover_url: str = album_images[0]["url"] if album_images else ""

        return {
            "is_playing": playback_state.get("is_playing", False),
            "track_id": track_item.get("id"),
            "track_name": track_item.get("name"),
            "artist_name": ", ".join(
                artist["name"] for artist in track_item.get("artists", [])
            ),
            "album_name": track_item.get("album", {}).get("name"),
            "album_art_url": album_cover_url,
            "duration_ms": track_item.get("duration_ms", 0),
            "progress_ms": playback_state.get("progress_ms", 0),
            "device_name": playback_state.get("device", {}).get(
                "name", "Unknown Device"
            ),
            "volume_percent": playback_state.get("device", {}).get(
                "volume_percent", 100
            ),
        }
```

### 3.4 Color Extraction Service (`services/color_extractor.py`)

```python
from io import BytesIO
from typing import Dict

import colorgram
import requests


class AmbientColorExtractor:
    @staticmethod
    def extract_palette(image_url: str, color_count: int = 4) -> Dict[str, str]:
        fallback_palette = {
            "dominant_hex": "#1e293b",
            "accent_hex": "#3b82f6",
            "ambient_rgb": "30, 41, 59",
        }
        if not image_url:
            return fallback_palette

        try:
            image_response = requests.get(image_url, timeout=3.5)
            image_response.raise_for_status()

            image_stream = BytesIO(image_response.content)
            extracted_colors = colorgram.extract(image_stream, color_count)

            if not extracted_colors:
                return fallback_palette

            dominant = extracted_colors[0].rgb
            accent = extracted_colors[1].rgb if len(extracted_colors) > 1 else dominant

            return {
                "dominant_hex": f"#{dominant.r:02x}{dominant.g:02x}{dominant.b:02x}",
                "accent_hex": f"#{accent.r:02x}{accent.g:02x}{accent.b:02x}",
                "ambient_rgb": f"{dominant.r}, {dominant.g}, {dominant.b}",
            }
        except Exception:
            return fallback_palette
```

### 3.5 HTTP Controller Endpoints (`app.py`)

```python
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS

from services.color_extractor import AmbientColorExtractor
from services.spotify_service import SpotifyServiceManager

load_dotenv()

application = Flask(__name__)
CORS(
    application,
    resources={
        r"/api/*": {"origins": [os.getenv("FRONTEND_URL", "http://127.0.0.1:3000")]}
    },
    supports_credentials=True,
)

spotify_service = SpotifyServiceManager()


@application.route("/api/auth/login", methods=["GET"])
def handle_spotify_login():
    return redirect(spotify_service.get_authorization_url())


@application.route("/api/auth/callback", methods=["GET"])
def handle_spotify_callback():
    authorization_code = request.args.get("code")
    if not authorization_code:
        return jsonify({"error": "Missing authorization code"}), 400

    spotify_service.request_access_token(authorization_code)
    frontend_destination = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000")
    return redirect(f"{frontend_destination}?auth=success")


@application.route("/api/auth/status", methods=["GET"])
def handle_auth_status():
    is_authenticated = spotify_service.get_spotify_client() is not None
    return jsonify({"authenticated": is_authenticated})


@application.route("/api/playback/current", methods=["GET"])
def handle_current_playback():
    playback_payload = spotify_service.fetch_current_playback()
    if not playback_payload:
        return jsonify({"is_playing": False, "track": None, "palette": None}), 200

    color_palette = AmbientColorExtractor.extract_palette(
        playback_payload["album_art_url"]
    )
    return jsonify(
        {
            "is_playing": playback_payload["is_playing"],
            "track": playback_payload,
            "palette": color_palette,
        }
    ), 200


if __name__ == "__main__":
    application.run(host="127.0.0.1", port=5000, debug=True)
```

---

## 4. Frontend Implementation Spec (Next.js)

### 4.1 Directory Hierarchy

```
flowsound-frontend/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AmbientBackground.tsx
│   ├── GlassCard.tsx
│   ├── PomodoroTimer.tsx
│   └── SpotifyPlayerCard.tsx
└── types/
    └── playback.ts
```

### 4.2 TypeScript Interfaces (`types/playback.ts`)

```typescript
export interface AmbientPalette {
  dominant_hex: string;
  accent_hex: string;
  ambient_rgb: string;
}

export interface TrackMetadata {
  is_playing: boolean;
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string;
  album_art_url: string;
  duration_ms: number;
  progress_ms: number;
  device_name: string;
  volume_percent: number;
}

export interface PlaybackApiResponse {
  is_playing: boolean;
  track: TrackMetadata | null;
  palette: AmbientPalette | null;
}
```

### 4.3 Global Styles (`app/globals.css`)

```css
@import "tailwindcss";

:root {
  --ambient-hue: 220, 38%, 12%;
  --ambient-accent: #3b82f6;
  color-scheme: dark;
}

html, body {
  background-color: #030712;
  color: #f9fafb;
  min-height: 100%;
  overscroll-behavior: contain;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 4.4 Ambient Canvas (`components/AmbientBackground.tsx`)

```typescript
"use client";

import React from "react";
import { AmbientPalette } from "@/types/playback";

interface AmbientBackgroundProps {
  palette: AmbientPalette | null;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ palette }) => {
  const dynamicGradients = palette
    ? {
        backgroundImage: `
          radial-gradient(at 15% 15%, rgba(${palette.ambient_rgb}, 0.35) 0px, transparent 65%),
          radial-gradient(at 85% 85%, ${palette.accent_hex}22 0px, transparent 70%)
        `,
      }
    : undefined;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none transition-[background-image] duration-1000 ease-out will-change-[background-image]"
      style={dynamicGradients}
    >
      <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-3xl" />
    </div>
  );
};
```

### 4.5 Container Card (`components/GlassCard.tsx`)

```typescript
import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "" }) => {
  return (
    <section
      className={`
        relative overflow-hidden
        rounded-3xl border border-white/10
        bg-white/[0.03] backdrop-blur-2xl
        shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_1px_0_rgba(255,255,255,0.15)]
        p-6 sm:p-8
        transition-colors duration-500
        ${className}
      `}
    >
      {children}
    </section>
  );
};
```

### 4.6 Player Presentation (`components/SpotifyPlayerCard.tsx`)

```typescript
"use client";

import Image from "next/image";
import React from "react";
import { TrackMetadata } from "@/types/playback";

interface SpotifyPlayerCardProps {
  track: TrackMetadata | null;
  isLoading: boolean;
}

export const SpotifyPlayerCard: React.FC<SpotifyPlayerCardProps> = ({
  track,
  isLoading,
}) => {
  if (isLoading && !track) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading player data…"
        className="flex flex-col items-center"
      >
        <div className="w-64 h-64 rounded-2xl bg-white/5 animate-pulse mb-6 border border-white/5" />
        <div className="h-6 w-44 bg-white/10 rounded-md animate-pulse mb-2" />
        <div className="h-4 w-28 bg-white/5 rounded-md animate-pulse" />
      </div>
    );
  }

  if (!track || !track.track_name) {
    return (
      <div className="flex flex-col items-center text-center p-6">
        <div className="w-64 h-64 rounded-2xl border border-dashed border-white/10 flex items-center justify-center mb-6">
          <p className="text-neutral-500 text-sm">Spotify is inactive</p>
        </div>
        <h2 className="text-lg font-semibold text-neutral-300">Nothing Playing</h2>
        <p className="text-neutral-500 text-sm mt-1">
          Playback on any device to activate FlowSound.
        </p>
      </div>
    );
  }

  return (
    <article aria-label="Current Spotify Track" className="flex flex-col items-center text-center">
      <div className="relative group mb-6">
        <div className="w-64 h-64 relative rounded-2xl overflow-hidden shadow-[0_12px_24px_-4px_rgba(0,0,0,0.8),0_4px_8px_-2px_rgba(0,0,0,0.6)] border border-white/10">
          <Image
            src={track.album_art_url}
            alt={`${track.album_name} album artwork`}
            className="object-cover select-none"
            fill
            sizes="256px"
            priority
          />
        </div>
      </div>

      <div className="max-w-xs overflow-hidden">
        <h2
          translate="no"
          className="text-xl font-bold tracking-tight text-white truncate"
          title={track.track_name}
        >
          {track.track_name}
        </h2>
        <p
          translate="no"
          className="text-sm font-medium text-neutral-400 truncate mt-1"
          title={track.artist_name}
        >
          {track.artist_name}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`inline-block w-2 h-2 rounded-full ${track.is_playing ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"}`}
        />
        <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
          {track.is_playing ? `Playing on ${track.device_name}` : "Paused"}
        </span>
      </div>
    </article>
  );
};
```

### 4.7 Pomodoro Module (`components/PomodoroTimer.tsx`)

```typescript
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export const PomodoroTimer: React.FC = () => {
  const DEFAULT_WORK_SECONDS = 25 * 60;
  const [secondsLeft, setSecondsLeft] = useState<number>(DEFAULT_WORK_SECONDS);
  const [isActive, setIsActive] = useState<boolean>(false);
  const timerReference = useRef<NodeJS.Timeout | null>(null);

  const toggleTimer = useCallback(() => {
    setIsActive((previousState) => !previousState);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setSecondsLeft(DEFAULT_WORK_SECONDS);
  }, []);

  useEffect(() => {
    if (isActive) {
      timerReference.current = setInterval(() => {
        setSecondsLeft((previous) => {
          if (previous <= 1) {
            if (timerReference.current) clearInterval(timerReference.current);
            setIsActive(false);
            return 0;
          }
          return previous - 1;
        });
      }, 1000);
    } else if (timerReference.current) {
      clearInterval(timerReference.current);
      timerReference.current = null;
    }

    return () => {
      if (timerReference.current) clearInterval(timerReference.current);
    };
  }, [isActive]);

  const minutesPart = Math.floor(secondsLeft / 60);
  const secondsPart = secondsLeft % 60;
  const formattedTime = `${String(minutesPart).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;

  return (
    <section
      aria-label="Pomodoro Focus Engine"
      className="flex flex-col items-center justify-center mt-6"
    >
      <div
        role="timer"
        aria-live="polite"
        className="text-5xl font-mono tabular-nums tracking-tighter text-white font-bold my-2"
      >
        {formattedTime}
      </div>

      <span className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase mb-4">
        Focus Block
      </span>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTimer}
          aria-label={isActive ? "Pause focus block" : "Start focus block"}
          className="
            min-h-[44px] min-w-[96px] px-4 py-2
            rounded-xl bg-white/10 hover:bg-white/15
            border border-white/10 active:scale-95
            text-sm font-semibold text-white
            focus-visible:ring-2 focus-visible:ring-white/80 focus:outline-none
            transition-transform duration-150 ease-out
            touch-manipulation
          "
        >
          {isActive ? "Pause" : "Start"}
        </button>

        <button
          type="button"
          onClick={resetTimer}
          aria-label="Reset timer back to twenty five minutes"
          className="
            min-h-[44px] px-4 py-2
            rounded-xl bg-transparent hover:bg-white/5
            border border-transparent hover:border-white/5 active:scale-95
            text-sm font-medium text-neutral-400 hover:text-white
            focus-visible:ring-2 focus-visible:ring-white/80 focus:outline-none
            transition-colors duration-150
            touch-manipulation
          "
        >
          Reset
        </button>
      </div>
    </section>
  );
};
```

### 4.8 Dashboard Orchestrator (`app/page.tsx`)

```typescript
"use client";

import React, { useEffect, useState } from "react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { GlassCard } from "@/components/GlassCard";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { SpotifyPlayerCard } from "@/components/SpotifyPlayerCard";
import { PlaybackApiResponse } from "@/types/playback";

export default function FlowSoundHome() {
  const [playbackData, setPlaybackData] = useState<PlaybackApiResponse>({
    is_playing: false,
    track: null,
    palette: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPlaybackState = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/playback/current",
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Playback service unavailable");
      const payload: PlaybackApiResponse = await response.json();
      setPlaybackData(payload);
    } catch {
      // Retains existing state during transient failures
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaybackState();
    const pollingInterval = setInterval(fetchPlaybackState, 3500);
    return () => clearInterval(pollingInterval);
  }, []);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      <AmbientBackground palette={playbackData.palette} />

      <header className="mb-6 text-center">
        <h1 className="text-xs font-bold tracking-[0.25em] text-white/60 uppercase">
          FlowSound <span className="text-white/30">/</span> Aura v1.0
        </h1>
      </header>

      <GlassCard className="w-full max-w-sm flex flex-col items-center">
        <SpotifyPlayerCard isLoading={isLoading} track={playbackData.track} />
        <div className="w-full h-px bg-white/10 my-6" role="separator" />
        <PomodoroTimer />
      </GlassCard>

      <footer className="mt-8 text-center">
        <p className="text-xs text-neutral-500">
          Press{" "}
          <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-neutral-300">
            Tab
          </kbd>{" "}
          to cycle inputs. Non-blocking audio context.
        </p>
      </footer>
    </main>
  );
}
```

---

## 5. Web Interface Guidelines Compliance Breakdown

### Interactions
- Controls are native `<button>` tags with `min-h-[44px]` for mobile touch boundaries.
- `touch-action: manipulation` prevents double-tap zoom behavior on fast-click actions.
- Focus states use distinct `:focus-visible` rings with neutral offset contrasting against the glass backdrop.

### Animations & Performance
- Transitions explicitly target isolated properties (`transition-transform`, `transition-colors`) instead of `transition: all`.
- Dynamic theme backgrounds operate on GPU-composited layers (`will-change-[background-image]`).
- A full `@media (prefers-reduced-motion: reduce)` killswitch is embedded globally.

### Content & Typography
- Numbers leverage `tabular-nums` via the monospace display to guarantee layout stability during countdowns.
- Technical entities and artist/album metadata are flagged with `translate="no"`.
- Skeletons maintain identical geometric footprints (`w-64 h-64`) preventing Cumulative Layout Shift (CLS).

---

## 6. Local Setup & Execution Guide

### Backend Service (Flask)

```bash
cd flowsound-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:

```text
SPOTIFY_CLIENT_ID="your_spotify_client_id_here"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret_here"
SPOTIFY_REDIRECT_URI="http://127.0.0.1:5000/api/auth/callback"
FRONTEND_URL="http://127.0.0.1:3000"
```

Start the Flask API server:

```bash
cd flowsound-backend
python app.py
```

### Frontend Application (Next.js)

```bash
cd flowsound-frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

Start the Next.js development server:

```bash
npm run dev -- -p 3000
```