# FlowSound — Session Log

**Last updated:** 2026-08-03 (Session 1)
**Status:** Backend + web UI working, no real Spotify creds yet, aura engine not built.

> This document is the canonical handoff for the next opencode session. Read this
> first to restore full context, then continue from **Next steps**.

---

## 1. Project at a glance

FlowSound = a dark "glassmorphism" focus-music desktop experience:

- Shows your **currently-playing Spotify track** (album art, title, artist).
- **Pomodoro timer** with a full cycle: Work 25min → Short break 5min (×4) → Long break 15min.
- Future "**aura**" feature: derive an ambient color glow from the album art.
- Playback controls: previous / play-pause / next.

**Current stack:** Python backend (**FastAPI + uvicorn**) serving a **static HTML/CSS/JS** frontend with a **WebSocket** for live updates. Runs in the user's system browser.

---

## 2. File map (current)

| File | Role | Status |
|---|---|---|
| `main.py` | Launcher: boots uvicorn + auto-opens browser | ✅ working |
| `server.py` | FastAPI app: static files, REST endpoints, WS, background timer+poller tasks | ✅ working |
| `static/index.html` | UI markup (glass cards, playback + timer controls) | ✅ working |
| `static/styles.css` | Dark glassmorphism theme, CSS `--aura` glow var | ✅ working |
| `static/app.js` | WS client (reconnect), DOM updates, control handlers | ✅ working |
| `spotify_manager.py` | `SpotifyAuraManager`: env creds, Redis token cache, playback ops | ✅ working |
| `spotify_engine.py` | `SpotifyEngine`: 3s poller, track/play-state change callbacks | ✅ working |
| `utils.py` | `load_env()`, `format_mmss()`, `PomodoroTimer` state machine | ✅ working |
| `aura_logic.py` | **Empty stub** — future colorgram aura engine | ⏳ planned |
| `copy` | Old flet-era backup of main.py (leftover, safe to delete) | 🗑 old |
| `.env.example` | Template for Spotify creds | ✅ |
| `.gitignore` | env/venv/cache ignores (no git repo yet) | ✅ |
| `Logs/` | This handoff doc | ✅ |
| `.venv/` | Python 3.14 venv (see gotcha #1) | — |

**Key data flow:** `spotify_engine` polls Spotify → sync callbacks → `_schedule_broadcast()` → WS push → `app.js` updates DOM. Timer ticks on the **backend** every 1s (so it stays accurate even if the browser tab is backgrounded) → WS push.

---

## 3. Stack decision (why we left Flet)

The app was originally **Flet** (Python → Flutter webview engine). Two problems:

1. **Slow start** — `import flet` alone took ~1.1s; full app startup was several seconds (bundled Flutter engine + web server + webview).
2. **Crashed** — native GTK/Flutter memory-corruption crash (`free(): chunks in smallbin corrupted`) killed the window after ~30s.

User chose **"Local web app in browser"** from the options: Python backend (FastAPI + WebSocket) + real HTML/CSS/JS. Startup is now ~0.5s, and CSS `backdrop-filter: blur()` gives true glassmorphism (the flet webview was faking it). Flet 0.84 is still installed in the venv but **unused — do not revert**.

---

## 4. Session change log (chronological)

1. **Analysis** — identified FlowSound as a flet focus-music + pomodoro app; empty stubs (`aura_logic.py`, `spotify_engine.py`, `ui_components.py`, `utils.py`) left open.
2. **Round-1 plan** — scope chosen by user: wire live Spotify, playback controls, full pomodoro cycle, `.env` auth, use Redis. Aura engine deferred.
3. **Redis installed** — no sudo available, so built **Redis 7.2.5 from source** into `~/.local/bin/redis-server`, running daemonized on `127.0.0.1:6379`.
4. **`utils.py`** — `load_env()` (tiny .env parser), `format_mmss()`, `PomodoroTimer` (WORK 25 / SHORT 5 ×4 / LONG 15; start-pause-reset-skip; auto phase transitions; auto-starts next phase on transition).
5. **`spotify_manager.py`** — rewritten: creds from env (clear error if missing), spotipy `RedisCacheHandler` (key `flowsound:spotify_token`) with graceful `MemoryCacheHandler` fallback, methods `play/pause/toggle_playback/next_track/previous_track`, `get_current_playback_info()` (+ alias `get_current_playback_into`), includes `track_id`.
6. **`spotify_engine.py`** — `SpotifyEngine` async poller (3s interval), fires `on_track_change` / `on_play_state_change`, mirrors last track id to Redis key `flowsound:last_track`.
7. **`ui_components.py`** (flet) — created `FlowSoundUI`, then **deleted** during the stack migration (#12).
8. **`main.py`** (flet) — async orchestrator with `page.run_task` loops.
9. **`.env.example` + `.gitignore`** created.
10. **Verification round 1** — compile + smoke tests passed: timer state machine, Redis round-trip, cache handler, no-creds guard, manager construct with Redis attached.
11. **Flet launch failed** → stack change decision (see §3). Added a no-creds fallback to the flet UI, then abandoned it.
12. **FastAPI stack built** — installed `fastapi 0.141.1` + `uvicorn 0.52.1` (`uvicorn[standard]`).
13. **`server.py`** — `lifespan` initializes manager/engine, starts `timer_loop` + `poll_loop` background tasks; endpoints: `GET /`, `GET /api/state`, `POST /api/playback/{action}`, `POST /api/timer/{action}`, `WS /ws`. Broadcast helpers; `app_state()` snapshot; timer/track/play WS message types.
14. **`static/`** — `index.html`, `styles.css` (glassmorphism, `--aura` glow), `app.js` (WS reconnect, optimistic play toggle, disconnected state, DOM updates).
15. **`main.py` rewritten** — uvicorn launcher + `webbrowser.open` after 1.5s; `FLOWSOUND_HOST`/`FLOWSOUND_PORT` env overrides (default `127.0.0.1:8765`).
16. **Removed** dead flet `ui_components.py`.
17. **Verification round 2** — server boots, browser auto-opens, `/api/state` correct, timer reset endpoint works, WS delivers state + 1s timer ticks, playback action returns graceful `{"ok":false,"error":"Spotify not connected"}`, screen render confirmed via grim screenshot histogram.
18. **This log** created.

---

## 5. Verified working (end of session)

- Server starts fast, serves UI, auto-opens `http://127.0.0.1:8765`.
- WS: full `state` push on connect + `timer` push every 1s.
- Pomodoro timer: reset works, counting works, phase machine unit-tested.
- Redis reachable (token cache active, `flowsound:last_track` writes).
- No-creds path: UI shows "Connect to Spotify", playback buttons disabled — **the app is currently in this state** (no `.env`).

---

## 6. Environment gotchas (IMPORTANT)

1. **venv `pip` is broken** — the venv was moved from `/home/KyuuLM/...` to `/home/josesito/...`; `pip`'s shebang points at the old path. **Always use `.venv/bin/python -m pip`** (not `.venv/bin/pip`).
2. **Redis binary is not on PATH** — it's at `~/.local/bin/redis-server`. If Redis is down, the app **still works** but silently falls back to an in-memory token cache. Start it with:
   `~/.local/bin/redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --dir ~/.local/share/flowsound`
3. **Flet crash history** — flet 0.84 is installed but unused; it crashed with native memory corruption. Don't reintroduce it.
4. **No git repo yet** — `.gitignore` exists but there's no `.git`. Consider `git init` next session.
5. `RequestsDependencyWarning` (chardet) on every spotipy import — harmless, pre-existing.
6. Screenshots: `grim` (Wayland) works, `import` (X11) does not on this session type.

---

## 7. Next steps (resume here)

1. **Get real Spotify creds** — user creates `.env` from `.env.example` (needs a Spotify Developer app; redirect URI `http://127.0.0.1:8888/callback`). Relaunch → UI goes live; **test playback controls against real Spotify** (needs an active device).
2. **Aura engine** (the original product vision) — implement in `aura_logic.py`:
   - On track change, fetch album art bytes server-side, run `colorgram` (already installed) to extract dominant colors.
   - Push a new WS message `{"type":"aura","data":{...}}` and have `app.js` set the CSS `--aura` variable (currently a static blue `rgba(70,110,255,0.45)` in `styles.css`).
   - Optional: cache palettes in Redis keyed by track id.
3. **Timer polish options** — auto-pause timer when Spotify playback pauses (user chose the full cycle without it; ask if wanted); track progress bar; audible phase-change cue.
4. **UI/UX extras** — track progress/position bar, volume control, device selector, PWA/electron-shell wrapper if a native window is wanted later.
5. **Hygiene** — `git init` + first commit; delete `copy` (old backup) and stray `__pycache__` if desired; consider pinning deps in `requirements.txt` (list: fastapi, uvicorn[standard], spotipy, redis, requests, websockets, colorgram).

---

## 8. How to run

```bash
cd /home/josesito/Documents/FlowSound
# ensure Redis is up (optional but recommended):
~/.local/bin/redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --dir ~/.local/share/flowsound
# start the app (auto-opens http://127.0.0.1:8765):
.venv/bin/python main.py
# stop:
pkill -f "python main.py"
```

Spotify creds go in `.env` (from `.env.example`). No creds → app still runs, shows a "Connect to Spotify" state.
