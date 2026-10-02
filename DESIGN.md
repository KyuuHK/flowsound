# FlowSound Frontend — Design Record

Designed with the `impeccable` skill. Companion doc: `PRODUCT.md` (product truth).

## Direction
**"Rounded paper instrument deck"** — a chalk-cream **full-bleed** viewport (no
card-in-a-window). A floating **segmented control** (Focus / Player / Tasks) with a
sliding white thumb sits top-left; content composes edge-to-edge and centered on the
cream ground, and the Focus engine lives around a floating bottom dock. One category
accent while playing, one Apple-red double-dot marking the focus clock; **SF Pro
Rounded** in every role — **Semibold** for letters and controls, the **Heavy** cut
reserved for the main clock; every motion is sprung and bouncy. Music keeps playing
across tab switches (all panes stay mounted). Chosen by the user (evolved from the
earlier clean all-white paper world, the side-by-side two-sheet deck, and the
single-sheet tabbed deck) and reshaped by `reformat.md`. Playback is the bundled,
CC0-licensed **Open Lo-Fi** library — no external account or API credentials needed.

## What existed before
- The all-white paper deck: `Geist`/`Geist Mono`/`Fraunces`, white canvas, expo-eased
  motion, `:` colon. **Replaced** — whole-typography rework to Nunito, canvas moved to
  chalk cream `#EFE9DC`, springs everywhere, red double-dot colon.
- **Nunito (Google, 9 weights). Replaced** by the user-supplied **SF Pro Rounded**
  (`font/SF-Pro-Rounded-*.ttf`, shipped locally via `next/font/local`) — two cuts only:
  Semibold for every letter and control, Heavy solely for the focus drum.
- The odometer fluidity, hold-to-reset, reduced-motion flatten and behavior/API
  contract were preserved throughout.
- The playback rail was Spotify (auth flow, playback poll, album-art accent). **Replaced**
  by the built-in lo-fi library: each of the ten moods carries its own accent, tracks
  stream straight from the Flask backend, and the deck needs no account.
- The side-by-side two-sheet layout (player + focus panels in one frame). **Replaced**
  by a tabbed deck after the user supplied `segmented-control-navigation.md`: a floating
  segmented control with a sliding thumb, a satellite theme circle, one screen per tab.
  Music persistence across tabs is a hard requirement, so panes stay mounted (never
  unmounted on switch).
- The **single-sheet tabbed deck** (white `ConsolePanel` sheet under the nav).
  **Replaced** by the full-bleed viewport of `reformat.md`: the white sheet is removed
  on every screen, Focus becomes the default/first tab, components adapt to the wider
  space (centered, "not too big, not too small"), and the Focus controls consolidate
  into one floating bottom dock whose WORK/BREAK pills hide while running.

## Design decisions

### Shell & layout
- **Full-bleed, no card-in-a-window** — no page header, footer, or white sheet. The
  cream canvas `#EFE9DC` is the app: every screen composes directly on it, centered.
  A floating **segmented control** (Focus / Player / Tasks) with a sliding white thumb
  sits top-left (`fixed`, `z-50`); `main` is `h-svh` / `overflow-hidden` at `lg` and
  up, so the deck fills the viewport and the page never scrolls. Below `lg` each pane
  scrolls internally.
- **All three panes stay mounted** — switching tabs only flips `hidden`/`flex` on the
  panels (`aria-hidden` + `role="tabpanel"`), never unmounts them, so **audio continues
  across tab switches** (the `<audio>` element keeps its `src`); the sliding nav thumb
  is the motion of the switch, not a pane remount.
- **Centered, adaptively sized** — the page renders each pane as a flex scroller
  (`min-h-0 flex-1 overflow-y-auto`) and each screen is an `m-auto min-h-full` column,
  so LofiPlayer / PomodoroTimer / TasksPanel centre vertically and horizontally when
  there is room and degrade to a top-anchored internal scroll on tight windows (never
  clips). Sizing is deliberately capped — artwork `min(72vw,300px)` / `lg:min(30vh,340px)`,
  dock pills `h-11`, modules short of both the too-big and too-small extremes the user
  flagged.
- **Light only**: `color-scheme: light`. Canvas = chalk cream `#EFE9DC`
  (`--background`); the only white surfaces left are elevated controls (individual
  pill islands — dock pills/steps, Start/Pause, Reset, transport), so the deck reads
  as raised paper on the warm ground.
- **SF Pro Rounded everywhere** (two local faces via `next/font/local`): the only
  family. Body base weight is **Semibold (600)** — every letter, chip, pill, button and
  label renders Semibold — and the **Heavy (800)** cut is reserved for the focus clock
  drum. All explicit `font-bold`/`font-medium` classes were normalised to
  `font-semibold` so nothing ever falls through to Heavy. Fraunces serif, Geist and
  Nunito retired. The track title is SF Pro Rounded Semibold, non-italic.
- Counter drum is **SF Pro Rounded Heavy** (`font-extrabold` → 800) at
  `clamp(4rem,12vw,9rem)`, tight tracking — heavy rounded digits, highly legible.
- Micro-tracked uppercase labels tuned down (tracking ≈0.14–0.22em) so small SF Pro Rounded
  reads crisp on cream.
- `--ink-faint` darkened slightly for the 10px meta ≥4.5:1 on cream.

### Color / light
- Custom tokens in `globals.css`: `--ink`, `--ink-muted`, `--ink-faint`, `--paper`
  (now the cream), `--accent-now` (ink fallback), and new `--accent-red`
  (`oklch(0.59 0.21 22)` ≈ Apple system red `#ff3b30`).
- The **category accent** is the only playing color (live dot + VU fills). Each of the
  ten lo-fi moods owns a warm oklch hue defined in `LofiPlayer.tsx` (moss for
  `asian-lofi`, rain-sky for `seasonal-weather`, ember for `jazzhop`, indigo for
  `late-night`, …); the accent follows the active category, not album art. The red
  double-dot and the red Start/Pause pill + red session pips are fixed, always-on
  accents belonging to the Focus Engine.
- `-webkit-tap-highlight-color: transparent` + `user-select: none` on buttons (iOS
  polish).

### Motion — Apple-like springs
- **Two spring systems, one character.** The Focus Engine and LofiPlayer keep their
  zero-dep **`usePressBounce`** WAAPI springs (`--ease-spring`); the segmented control's
  sliding thumb and the bottom-dock state swaps use **Framer Motion** (`layoutId` +
  spring `{ stiffness: 450, damping: 35, mass: 0.8 }`), part of the dependency tree for
  the nav. Both flatten to instant under reduced motion (`useReducedMotion` /
  `prefers-reduced-motion` global).
- `--ease-expo` (roll) kept; added `--ease-spring: cubic-bezier(0.34,1.56,0.64,1)`.
- `hooks/usePressBounce.ts`: Web Animations API press-then-bounce, two planes.
  - `scale` (icon-only controls, e.g. the player's play capsule): press squishes to
    `scale(0.9)`; release (tracked on `window`, so it fires off-button) springs
    back `0.9 → 1.02 → 1` over 340ms.
  - `translate` (text-bearing dock controls): scaling text re-rasterizes glyphs at
    fractional sizes (reads as the text "blurring then snapping sharp"), so the
    dock instead presses `translateY(1px)` and springs past rest to `-1.5px` then
    back to 0 over 320ms — pure translation never blurs glyphs. Reduced-motion-aware,
    zero deps.
- `hooks/useHoverSteps.ts`: the play capsule's spring **shape** on text controls, as a dense
  crisp ladder. `~6` `steps(1,end)` hops sample its silhouette — `1 → 1.02 → 1.035 →
  1.048 → 1.052 → 1.04` (~190ms, overshoot-and-settle) — each hop *holds then jumps*,
  so the element only ever re-rasterizes at fixed sizes: visible spring motion with zero
  fractional-scale glyph blur. Rest is natural (scale 1), hover-out plays the ladder
  reversed, both `fill: forwards`. (The **pre-scaled-raster** approach — resting at
  `1/1.04` and springing continuously to `1.0` — was tried and REJECTED in practice:
  without a resident compositor layer Chromium re-rasterizes at fractional scales on
  every spring frame, so the text blurred anyway, and the forced -4% rest read as
  "squished".) Animates the independent `scale` property (never `transform`), so it
  composes with `paint()` and `usePressBounce` on the same node. Reduced-motion +
  non-hover surfaces stay at natural size — the `(hover:hover)` media scoping.
- The dock and the whole UI share one **hover + press language** from
  `lib/pressSurface.ts`: hover **zooms in place** (`scale 1.04` net, media-scoped to
  `(hover:hover)`, so touch never sticks). The transition list deliberately
  **excludes `transform`** — the dial's imperative `paint()` rewrites it per frame
  and `usePressBounce` animates it via WAAPI, so neither is CSS-transitioned.
  Zoom lives on Tailwind v4's independent `scale` property, so it composes with
  (never fights) those `transform` writers. Everything flattens under reduced motion.
- **Springy vs steps ladder**: icon-only controls (play/prev/next, palette
  satellite, dock Reset) keep the CSS **springy** scale (`hoverZoomClass`,
  `--ease-spring` ~200ms) — smooth shapes tolerate the interpolated zoom. Text-bearing
  controls (nav tabs, dial pills, dock pills/Start/Steps) use `hoverZoomCrispClass`,
  which carries **no CSS hover scale at all** — `useHoverSteps` owns the zoom as the
  crisp ladder above (rest = natural size). The class only eases shadow/color/filter
  with `--ease-spring`.
- **Press is WAAPI, not CSS** — `:active` squish can't overshoot, so every pressable
  uses `usePressBounce`'s release spring (the Apple-bounce): icons squish `0.9 →
  1.02 → 1`; text dips `translateY 1px → -1.5px → 0` (glyphs never re-rasterize).
  The dial bounces its **inner label** (translate plane) so press motion never
  touches the button transform `paint()` owns. This replaced the CSS `active:scale-95`
  squish — same rest look, real overshoot.
- The dock swaps idle ⇄ running via Framer Motion `AnimatePresence mode="wait"`
  (slide up + fade, spring 450/35/0.8, instant under reduced motion). Both states are
  now **capsule-free**: no enclosing pill — each control floats as its own white island
  (presets `15/25/30` & `3/5/10`, `-`/`+` steps, the red Start/Pause, hold-to-reset)
  directly on the cream canvas. The station
  dial's active pill orbits with a spring `{ stiffness: 420, damping: 32, mass: 0.8 }`;
  play/pause icons remount with `pop-in` (320ms spring); the hold-to-reset fill is the
  one retained progress motion.
- VU bars eased with a gentle spring `cubic-bezier(0.34,1.32,0.64,1)` so each beat
  settles with a soft bounce (still 120ms interval paint, still hidden-tab skip).
- Reduced-motion: global flatline (0.01ms) plus WAAPI guard collapse the springs; the
  hold-to-reset fill (a progress indicator) is the only motion retained.
- Every pressable carries the shared surface: nav tabs + palette satellite,
  the dial's five pills, and the player transport (prev/play/next) render it;
  the dock's controls zoom on hover and press via `usePressBounce`. This replaced
  the per-component smorgasbord (dock lift `translateY`, nav color-fade, the
  satellite's `active:scale-95`, the ui-Button `active:translate-y-px`).

### Components
- **Full-bleed panes** — `ConsolePanel` (the white sheet) was deleted. The page owns a
  scroller per tab; each screen centres itself with `m-auto`.
- `NavigationSegmentedControl` — the floating top-left **segmented control** (Focus /
  Player / Tasks — **Focus first and default**) + satellite theme circle. Port of the
  user's `segmented-control-navigation.md` spec, re-skinned to the paper world: a
  translucent `ink/4` pill track with hairline `border-ink/6`, an elevated pure-white
  sliding thumb (`layoutId="activeScreenIndicator"`, dual-tier soft shadow, border
  `ink/4`), semibold SF labels when active, muted-warm when not. Spring physics are
  Framer Motion `{ stiffness: 450, damping: 35, mass: 0.8 }`, flattened to instant under
  reduced motion (`useReducedMotion`). WAI-ARIA: `role="tablist"/"tab"`, `aria-selected`,
  `aria-controls`, roving `tabIndex`, ArrowLeft/Right cycling, `:focus-visible:ring-2
  ring-ink/40`, 44px targets, `touch-manipulation`. The satellite `Palette` circle
  (44px, same fill/shadow as the thumb, `active:scale-95`) is a **real button**; the
  theme menu it will open is deferred until the user specifies the palette system.
- `TasksPanel` — centered WIP placeholder for the future user-created tasks: a muted
  circle with a `ListTodo` glyph, a "Tasks" heading, and "Coming soon" copy. No
  functionality yet, per the user.
- `VUMeter` — 28 bars, imperative 120ms paint; idle `#c6c6cc`, active `--accent-now`;
  `data-vu` hooks for QA.
- `player/StationInfiniteDial` — the **infinite rotary station dial** (carousel.md,
  paper re-skin) that replaced the ten-pill category chip grid: five visible pills
  around the active center, edges wrapping via modulo arithmetic and masking into the
  cream canvas. **Grab-and-drag**: the strip is a continuous position in station
  units — `pointerdown` captures and tracks 1:1 (`translateX` per rAF frame), dragging
  past either edge wraps forever (no dead ends), and release **springs/settles to the
  nearest station** — a slow, under-damped spring simulator (stiffness 130, damping
  ratio ~0.44, frame-time normalized) seeded with **lazy momentum**: the roll-out cap
  is just 1.25 stations (`FLING_MAX_STATIONS`), reached by any normal swipe
  (`FLING_CURVE_TOP` 0.9 px/ms), at a cruise of ~1.6 stations/s (`SEED_TRAVEL_S` 0.8)
  — the dial glides, it never blurs. A soft **magnet** inside a 0.45-station capture
  radius pulls it onto the slot with a gentle bounce.
  **Hold = dead momentum**: release velocity decays exponentially
  (`FLING_IDLE_DECAY_MS` 450) once the pointer stops, the idle clock ignores sub-2px
  mouse micro-jitter (`IDLE_RESET_PX`), and a stationary hold past `IDLE_KILL_MS`
  (400ms) cancels ALL momentum — the dial simply magnet-snaps to the parked station.
  No ghost-launch, ever.
  **Wrap routing**: the spring settles toward the *nearest congruent* copy of the
  target (`to + span·round((position−to)/span)`), so a flick near the end of the list
  hops across the seam the short way instead of integrating a full-track arc — the
  "crazy fast" whole-keyboard sweep is a thing of the past. All feel constants live in one `SETTLE_PHYSICS`/`FLING_*`/`VEL_*` block at
  the top of the file for easy tuning. **Spring sign caveat**: the force is
  `+stiffness * (to - position)` (restoring) — a minus flips it into positive feedback
  that diverges the strip forever (duplicate keys + every pill stacked at center once
  `position` passes 2^53); a runaway guard snaps to the slot if `position`/`velocity`
  go non-finite or `|velocity|` exceeds 256 stations/s. Pills are keyed by **slot** (five
  stable buttons) — the per-frame transform/opacity/zIndex, the station label, and the
  `aria-checked`/center-elevation classes are written straight to the DOM by an imperative
  `paint()` each frame, so the continuous animation never pays React reconciliation;
  a `useLayoutEffect` re-applies the paint after **every** render so external changes
  (stations swap, prop changes) never desync. Active center = white,
  elevated, `scale-105`, neighbors fade by distance to `opacity-35 scale-92`. Smaller
  pills (`min-h-[40px]`, `px-4`) with a widened mask fade (26/74 + `px-6`) so nothing
  reads as clipped. Reduced-motion keeps 1:1 drag but snaps instantly. Still
  supports click/tap-to-select and ArrowLeft/Right cycling (now animated). WAI-ARIA:
  `role="radiogroup"` + `role="radio"`/`aria-checked` follows the pill crossing center,
  `min-h-[44px]` tap targets, `touch-action: pan-y`, `cursor-grab`/`grabbing`. The
  `CategoryGlyph` "tick" squares are gone with the grid.
- <s>`player/AmbientArtworkTile` + `player/ReactiveAudioCanvas` + `player/stationThemes`</s>
  — the generative ambient sleeve (reactive.md) was **removed** in the player revamp
  (2026-09-09): files deleted, reactive.md superseded. The player's square seat is now
  the **room** (`data-player-room`), deliberately empty until music plays.
- `player/FluidAudioOrb` + `player/playerOrbColors` — the **monumental centerpiece**
  (orb.md): a Three.js **liquid-glass sphere**, zero-presence when paused, that
  **springs into the room** on play at ~65% scale. Vertex shader displaces the surface
  with 3D Simplex noise driven by the low-frequency bass energy (`0.18 + bass·0.35`),
  fragment shader renders a Fresnel rim, an internal vertical fluid gradient of the
  genre colorway, and a Blinn-Phong glint. `playerOrbColors.ts` holds a hex-pair
  registry per current station id (primary ≈ `CATEGORY_ACCENTS` hue, secondary = dark
  pole); station switches **lerp** the colorway. Hardened for the repo's tiers:
  `SphereGeometry(1, 64, 64)`, pixel ratio capped at `min(dpr, 2)`, full
  `dispose()`/rAF-cancel teardown, **parked rendering** — the loop runs only while the
  pane is active AND (playing OR presence animating), so the hidden Focus pane and a
  collapsed pause both draw **zero** canvas frames; `useReducedMotion` snaps presence
  and freezes ambient/rotation/bass. The render container is `aspect-square` +
  `overflow-hidden rounded-full` (a circular mask: the canvas gets a definite size —
  no attribute-size collapse — and bass-peak pokes read as the sphere's own shiny rim
  instead of a hard viewport clip). Painted presence is exposed as `data-presence` on
  the `data-orb` container for harness gates.
- `LofiPlayer` — self-contained lo-fi deck composed as one **centered vertical stack**
  on the bare canvas: the station dial at the top, then the **room** (same footprint:
  capped at `min(72vw,300px)` mobile / `min(30vh,340px)` desktop) hosting the orb only
  after the **first play** (~65%: `min(47vw,195px)` / `min(20vh,220px)`), then the
  semibold SF track title (`text-3xl`/`sm:text-4xl`), category meta, the hallowed ink
  transport pill (skip back / solid-ink play capsule with `pop-in` icon / skip
  forward), and the VU meter. Queue, auto-advance (`ended` → next), and play state all
  live locally; the `<audio>` element binds directly to
  `/api/music/stream/{category}/{filename}`, and the src never resets on a play/pause
  flip. The first play gesture lazily wires the shared Web Audio pipeline
  (`lib/audioContextManager.ts`, orb.md §5: one `AudioContext` →
  `createMediaElementSource` → `AnalyserNode(f,128, smoothing 0.8)` → destination,
  reused forever) whose analyser feeds the orb — the graph that was removed with the
  old orb is back, but **only** to drive the FluidAudioOrb, and its `three` chunk is
  `dynamic(ssr:false)` loaded on first play so idle app-load bytes are untouched. The
  "live dot / Playing–Paused eyebrow" is gone: play state reads from the transport
  glyph and the orb's presence. (The VU meter was removed on review — the orb *is*
  the visualizer now; `VUMeter.tsx` deleted.) The track title and the uppercase
  category eyebrow **crossfade on every track change** (framed `AnimatePresence`,
  keyed by `track.filename`): the old letters fade + drift up, the new ones fade in
  from below (~0.22s `easeOut`) inside fixed-height absolute boxes so the stack never
  jumps; `useReducedMotion` collapses it to an instant swap. Because the pane stays
  mounted across tab switches, the `<audio>` keeps playing even on the Focus/Tasks
  tabs (the orb parks itself there).
- `focus/FocusClockDisplay` — the **optical hero**, stripped to the big
  `SlidingDigitCounter` drum (`clamp(4rem,12vw,9rem)`) alone on the cream — the phase
  badge, the 24-segment time bar, and the session pips were all removed per the user
  (and their component files deleted).
- `focus/FocusControlDock` — the **consolidated floating bottom dock** (reformat.md),
  `fixed bottom-6 left-1/2`. **Idle** = one white capsule with the **Start +
  hold-to-reset pair center-flanked by the rails**: WORK `– 15 25 30 +`, Start pill,
  Reset circle, BREAK `– 3 5 10 +` (the reset sits beside the loud solid
  `--accent-red` Start pill, between the Work and Break rails; its hold-fill is
  `--accent-red` alpha — red instead of ink). **Running** = the capsule collapses
  (AnimatePresence) to exactly **Pause + hold-to-reset**. The **Skip** button is gone
  along with the sessions cleanup; pills are *medium-small* (44px tap targets,
  `text-xs`, tight padding) so both rails fit the midline; Start/Pause is a solid red
  medium pill for instant spotting; reset keeps the parent's **hold-to-reset**
  (pointer-capture + RAF fill, Enter/Space, 750ms). Every control sits under a
  springy hover-lift wrapper and uses the crisp translate spring; overflow is a
  touch-pan-x horizontal scroll on narrow screens.
- `PomodoroTimer` — owns all state (`nuqs` URL-backed), hold logic, and the composition:
  the hero clock + the dock. `phase = work|rest`, durations clamped [1..180]/[1..60].
- URL state is untrusted input: `work`/`rest`/`left`/`endsAt` are clamped at render, so
  a crafted query can never produce a NaN/negative/infinite face (e.g. `?work=0`,
  `?work=9999`, `?left=1e12`). `?running=1&endsAt=0` normalizes back to a paused phase,
  and a pause landing at exactly 00:00 advances instead of snapping back.
- `SlidingDigitCounter`/`ColonSeparator` — drum in SF Pro Rounded **Heavy** (seconds
  `ink`, minutes
  `ink/80`), clean digit windows (no slot, no vignette), base `clamp(3.25rem,11vw,6rem)`
  overridden by the Focus hero to `clamp(4rem,12vw,9rem)`, and the **red double-dot
  colon**: two `rounded-full` dots (~0.15em) stacked in `--accent-red`, em-scaled,
  `aria-hidden` + `data-colon`.
- Odometer mechanics unchanged and re-verified: 4 windows, 450ms `ease-expo` roll,
  pause-freeze via `left`, Enter/Space + pointer-capture hold, reduced-motion instant
  swap, `role="timer"`-style `section[aria-label]` authoritative + `sr-only` `aria-live`
  announcing **minute-granularity** ("X minutes remaining") — one screen-reader update
  per minute, not one per second; the visual drum keeps seconds.

### Behavior contract
- Big network assumptions are gone: the deck needs no auth, no account, and no external
  API. The only calls are three lo-fi data endpoints on the backend.
- **Tab switching never stops music**: all three panes stay mounted; switching sets
  `hidden`/`flex` + `aria-hidden` only. The `<audio>` element and every player state
  persist across tabs, so playback continues on the Focus and Tasks screens. **Focus is
  the first and default tab.**
- **The dock is context-driven**: idle shows **Start + hold-to-reset center-flanked by
  the Work rail (left) and Break rail (right)**; the moment a phase starts, the rails
  hide and only Pause + hold-to-reset remain (centered, exactly where they were);
  reset returns to idle with the rails back.
- `LofiPlayer` loads `/api/music/categories` once, swaps to a shuffled
  `/api/music/playlist/{category}` on dial change, and feeds `/audio` directly from
  `/api/music/stream/{category}/{filename}`. Play state flips never reload the buffer;
  only a track/category change sets `src`. Auto-advance wraps on `ended`; no
  `AudioContext` tap is wired anymore (the analyser graph died with the orb), so the
  element plays straight to the speakers.
- `lib/api.ts` hardens every request with an 8s timeout and structured
  `ApiError {status, message}`.
- Backend (`flowsound-backend/app.py`): the CC0 `OpenLo-Fi` catalog ships as
  `catalog.json` (bundled, loaded once); 166 MP3s live in `static/lofi/{category}/`;
  `/api/music/categories`, `/api/music/playlist/<category>` (shuffled per request), and
  `/api/music/stream/<category>/<filename>` (manifest-scoped, so an arbitrary path can
  never be served); CORS stays locked to the frontend origins; JSON 404/405/500
  handlers; debug off by default (`FLOWSOUND_DEBUG=1`). The old Spotify bridge
  (`spotipy`, OAuth, album-art extraction, Redis palette cache) was removed entirely.

## Performance (2026-09-09, harness-measured)
Discipline: build a *red-capable* perf harness first, baseline it, then fix and regression.
Frontend + backend stay in a single running pair; every phase ends with the full suite green.

- **Hidden-pane parking** — every canvas renderer parks when its work isn't visible.
  The FluidAudioOrb's `rAF` runs only while its pane is active AND (playing OR presence
  is animating); a collapsed pause and the hidden Focus/Tasks panes draw **zero** frames.
  Idle draw-rate: **0 on both devices**.
- **Load discipline** — fonts converted with `woff2_compress` (TTF originals kept);
  `next/font/local` pointed at `.woff2` (Heavy 1.57MB→535KB, Semibold 1.59MB→540KB, gzip'd
  wire 1.60MB→1.08MB); `<audio preload="metadata">` (verified via CDP: Chrome fetches the
  mount, then aborts — **0 audio bytes before play**); the **`three` orb chunk loads on
  the first Play** (`next/dynamic`, ssr:false), so app-load wire bytes stay unchanged
  until someone actually plays. First-play latency covers context creation + chunk
  fetch (a few tens of ms, far under the 1000ms gate); the harness **pauses before the
  dial-drag sampler** so the orb's rAF doesn't contend with the spring measurement.
  **Resume-before-play hardening**: Chrome can suspend the shared AudioContext
  (hidden tab / sleep), which makes the element "play" through total silence — so
  every Play press wakes the context (`ensureAudioContextRunning`, capped +
  best-effort) before `audio.play()`. Fresh in-gesture contexts are already running,
  so first-play latency is untouched. **Native + visual twin**: audible playback goes
  straight through the tracked `<audio>` element (device-routed, tab speaker icon
  shows), while a hidden **muted** `<audio>` twin (same src) is the *only* node fed
  into the Web Audio graph — so the orb gets its bass warble yet can never be the
  thing that mutts your music or hides the tab icon.
- **Streaming** — Werkzeug 3.1.8 already serves HTTP 206 Range natively (`Content-Range`,
  `If-Range` peek, out-of-range 416). `stream_track` adds `Cache-Control: public,
  max-age=31536000, immutable`; safe because filenames are content-addressed by the catalog
  manifest. Covered by tests.
- **Dial rendering** — see the `StationInfiniteDial` bullet above (imperative `paint()`).
  Drag frames on desktop went from flappy (mean 16.7–20.7ms, long frames up to **23%**) to
  **mean 16.67ms, 0% long frames** — a per-frame React render of 5 pills removed.
- **Dependency hygiene** — `swr` removed (unused); `i.scdn.co`/`mosaic.scdn.co` image
  `remotePatterns` removed. `next/font` remote patterns were the repos' only third-party origin.

## Verified
- `npm run lint`, `npx tsc --noEmit`, `npm run build` (Next 16, Turbopack) green.
- Playwright lo-fi harness (`/tmp/opencode/pw/lofi.js`) — ten category chips render,
  switching categories loads a live track (title + audio `src` pointing at
  `/api/music/stream/…`), transport enabled, zero console/page errors.
- Tab + full-bleed harness (`/tmp/opencode/pw/tabs.js`, updated for the reformat) —
  desktop 1440×900 **and** mobile 390×844, zero console/page errors:
  - **Focus is first and default** (`aria-selected` correct); panels swap `flex`/`none`.
  - **Fonts**: SF Pro Rounded Semibold + Heavy both load (`document.fonts.check` 600/800);
    body computes `font-family sfprorounded` at weight **600**, the clock drum computes
    **800** (Heavy).
  - **Idle dock**: WORK + BREAK rails (3 pills each) **flanking Start + Reset at the
    center** (reset spatially beside Start and between the rails), "Start Focus",
    the clock renders, `aria-live` announces "25 minutes remaining", and the
    **badge / time bar / session pips / skip button are all absent**; the reset hold-fill
    carries the `--accent-red` class.
  - **Start → running**: WORK/BREAK pills gone (0 remain), only "Pause Focus" + the
    hold-to-reset circle, URL `running=1`.
  - **Hold-to-reset fires**: real pointer hold ~850ms — Start returns, pills return,
    `done`/`running` back to defaults, clock shows 25:00.
  - **Audio persistence**: the `<audio>` element stays mounted with the **same `src`**
    across Focus → Tasks → Player (never remounted, never reloaded).
  - Player screen renders the **station dial** (exactly 5 radios, 1 active) + the
    reserved **room** (`data-player-room`, no `data-sleeve`/`data-reactor` anywhere) +
    transport in the centered stack; the **VU meter is gone entirely** (no
    `data-vu-meter`/`data-vu-fade` anywhere — the orb is the visualizer); the **orb
    (`data-orb`) is absent until first play**, then springs in (`data-presence` ≥ 0.3
    while playing) and collapses below 0.06 on pause; the dial shows no horizontal
    overflow on mobile either.
  - **Dial drag**: real pointer grab+drag ~1.7 steps right changes the center station
    (`Focus → Late Night` in the run), a leftward drag wraps back (`→ Focus`) — no
    dead end, radios intact at 5 through both drags.
  - **No page scroll** at 1440×900 (`docH == winH`); **zero horizontal overflow** at
    390; the Focus dock scrolls in-capsule on mobile (never the page).
- Detector clean (`detect.mjs` → `[]`).
- Perf harness (`/tmp/opencode/pw/perf.js`, BASE `http://localhost:3000`, Chromium pinned)
  **ALL PASS** desktop 1440×900 **and** mobile 390×844, 2026-09-09:
  - Hidden pane idle draw-rate **0/s** (both devices); console errors 0.
  - Font wire bytes **1,075,328** (load ~32–41ms); audio bytes **before play 0**; play
    latency **~60ms**.
  - Dial drag (desktop): mean **16.67ms**, long frames **0%**, max 16.8ms, exactly-one
    `aria-checked`, dial moved — the one-time red gate (`dialLongFramePct` 12.1%) is green.
  - Backend: pytest **20 passed** (CORS localhost alias, immutable Cache-Control, Range
    `206`/`Content-Range`, out-of-range `416`, `If-Range` match/mismatch).
- Uniform hover/press surface (`lib/pressSurface.ts`) verified 2026-09-09: `tsc`/`eslint`
  exit 0, build 2 static routes; `tabs.js` ALL PASS (nav tabs + dial radios + dock pills/
  start/reset + dial drag/hold/key/seam, exactly-one checked); `perf.js` ALL PASS both
  devices — dial paint gates untouched by the CSS `scale` hover/press (mean 16.7–17.2ms,
  ≤3.1% long frames at rest). One run under a 200%-CPU host process flapped the dial gate
  red (max frames ~100ms, fonts/latency 3–5x slower too) — confirmed load, not code.
- **Steps-ladder hover** (`useHoverSteps`) verified 2026-09-09: `tabs.js`
  asserts a nav tab reads computed `scale` `none/1` at rest, `1.04` on hover, `1`
  after leave, desktop + mobile ALL PASS; `perf.js` ALL PASS at idle (dial mean
  **16.66–16.67ms, 0% long, max ~16.8ms**) — the ~190ms one-shot animations add no
  per-frame cost. The `useHoverSpring` pre-scaled-raster variant was reverted after
  the user reported "squished then blurry then bigger" — the empirical lesson recorded
  above (a 4% rest-compression reads as squished and Chromium does not hold a single
  raster across a `scale`-property spring without a resident layer).

## Still open
- Per-category SVGs **for the dial** — the station pills are text-only; glyphs can
  return later if the user wants them in the dial's active pill.
- The **theme palette menu** behind the satellite circle — the button is live but the
  menu/plumbing is deferred (user: "it involves more things than just colors").
- **Tasks functionality** — WIP placeholder only, per the user.
- **Skip** — removed wholesale in the sessions cleanup; the running dock is exactly
  Pause + hold-to-reset and idle is rails + Start + reset. Reintroduce on request.
- Live audio QA on a real speaker/headphone (browser autoplay is user-gesture gated;
  the harness confirms loading but not audible playback).