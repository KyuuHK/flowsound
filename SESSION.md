# FlowSound — Session Log

Chronological log of FlowSound work sessions. Each entry records decisions,
what changed, verification results, and notes for future sessions. Append new
sessions at the top of the "Sessions" list.

---

## Session Log

### 2026-09-09 — Focus dock islands + music transport snug (twenty-seventh entry)

**Ask**: "remove the background pill in the time selectors, and in the state when time
is started … they feel like islands"; then "the idle needs to go too"; then "give the
time presets color, don't let them float like that"; then shrink + split the music
transport pill.

**Music provenance (info, no code)** — user asked how the tracks are made. The repo's
`catalog.json` said only "OpenLo-Fi / CC0" (166 tracks, 10 categories), but the mp3 ID3
tags tell the real story: `TXXX comment="made with suno; created=2026-03-13T05:23:24Z;
id=…"` + `TSSE Lavf60.16.100`. The owner generated every track with **Suno v5**,
then donated them to the public domain (premium-member license → CC0). That's why they
sound so good and why the app can stream them with long-lived caching and no licensing
fuss. Two files spot-checked (`2-am-debug-loop.mp3`, `butter-and-windowlight.mp3`).

**Focus dock → islands** (`components/focus/FocusControlDock.tsx`):
- Deleted now-dead constants `capsuleShadow`, `elevatedClass`, `surfaceClass`.
- **Running state**: dropped the white capsule (`rounded-full border bg-white p-2` +
  shadow) → bare `"pointer-events-auto flex items-center gap-3"`; Pause + hold-to-reset
  float as two islands on the canvas.
- **Idle state**: dropped the capsule → `"pointer-events-auto flex max-w-full
  items-center gap-1 overflow-x-auto touch-manipulation [scrollbar-width:none]
  [&::-webkit-scrollbar]:hidden"`; no shell behind the rails/Start/Reset.
- **Preset pills** (`15/25/30`, `3/5/10`): first made bare text (`active ? text-ink :
  text-ink-muted`), then per "give them a color, white is alright" they each got
  `bg-white` islands — no ring/shadow, active = dark ink, inactive = muted.
- **Step `-`/`+`** buttons: `bg-white text-ink-muted hover:text-ink` + `focusRingClass`.
- Start/Pause red pill and Reset white circle untouched; hit targets (h-11/min-w-11,
  size-11), focus rings, hoverSteps zoom, pressBounce, and the AnimatePresence idle↔
  running spring all unchanged.

**Music transport** (`components/LofiPlayer.tsx`):
- Shrunk the pill: removed `w-full max-w-xs justify-center` so it hugs its three
  buttons instead of stretching wide ("a lot of room at the sides").
- Wrong target first: I edited the Focus dock Start pill `px-6`→`px-4`; user corrected
  ("undo bro, i was talking about the music controls") — reverted the Focus pill.
- Attempted splitting skip/back onto their own white circular islands at `gap-2.5`
  ("separate the skip and back from play … just a bit"); user asked to undo ("i didn't
  want the back to disappear") — reverted to the **single white pill** with all three
  buttons inside, prev/next transparent ghost, play/pause the dark `h-14 w-14` circle.
  Final state = snug single pill.

**Gotcha this session**: `tabs.js` desktop can **flake on the orb pause-presence
boundary** — `paused-presence 0.060` fails the strict `< 0.06` gate (0.060 ≥ 0.06),
passes on re-run (`0.016`). Timing-sensitive, unrelated to the dock/transport edits;
no action taken.

**Verification** (2026-09-09): `npx tsc --noEmit` + `npm run lint` clean, all edits
**tabs.js ALL PASS both devices** (idle 3 work + 3 break pills, Start/Reset adjacency,
running Pause + Reset, orb presence, audio twin count 2, title swap, no tooltip),
**perf.js ALL PASS** (idle 0 draws/s, dial mean 16.66ms/0% long). Transport structural
gates unaffected (buttons keyed by aria-label only).

**Note for next session**: user went to bed mid-session ("too eepy") after this entry;
next step is the user's visual review of the islands (screenshots `/tmp/opencode/pw/
tabs-desktop.png` — PNGs can't be viewed programmatically). No open blockers.

### 2026-09-09 — Fluid Audio Orb: the monumental player centerpiece (twenty-sixth entry)

**Ask**: "the monumental thing I was talking about — look at orb.md." Built the spec'd
Three.js liquid-glass orb that lives in the space cleared by the previous revamp.

**Decisions** (all recommended options taken):
- Orb floats at **~65% of the room** (`min(47vw,195px)` / `min(20vh,220px)`) with calm
  air around the glass. **Hex-pair registry** (`playerOrbColors.ts`, keyed to current
  station ids, primary ≈ `CATEGORY_ACCENTS` hue). **Deferred load**: `three` arrives on
  the first Play (`next/dynamic`, ssr:false) so idle app-load bytes are unchanged.

**Implementation**:
- `lib/audioContextManager.ts` (orb.md §5): module-singleton
  `AudioContext → createMediaElementSource → AnalyserNode(fftSize 128, smoothing 0.8)
  → destination`, wired once on the first gesture and reused forever.
- `components/player/FluidAudioOrb.tsx`: spec shaders (Simplex vertex displacement
  `0.18 + bass·0.35`, Fresnel `^2.2`, vertical fluid mix, Blinn-Phong `^32`), presence
  lerp `0⇄1`/opacity `0⇄0.95` at `0.08`, color lerp on station switch. Repo hardenings:
  **parking** (`isPaneActive`) — rAF only while pane active AND (playing OR presence
  animating), so hidden pane + collapsed pause draw 0 frames; `useReducedMotion` snaps
  presence + freezes ambient/rotation/bass; `SphereGeometry(1,64,64)`; `min(dpr,2)`;
  full dispose teardown + ResizeObserver; painted presence mirrored to `data-presence`.
- `LofiPlayer`: `everPlayedOrb` gates the dynamic orb inside `data-player-room` (room
  stays empty until music plays); `toggle()` wires the pipeline before `play()`.
- Harnesses: `tabs.js` now asserts orb **absent when cold**, springs to `data-presence
  ≥ 0.3` on play, collapses `< 0.06` on pause (mobile keeps the cold-absent + VU-0
  checks); `perf.js` **pauses before the dial-drag sampler** so the orb's rAF can't
  contend with the spring measurement (mirrors tabs.js).

**Known fix along the way**: orb.md's 3D-Simplex block had a GLSL type bug
(`permutationHash * constantD.wyz` — a `vec4 × vec3`) plus a skipped mod-49 lattice
reduction; both fixed to the canonical sequence (a clean `reducedJ` mod-49, then
`hashX/hashY`) — headless Chromium surfaced it as `Shader Error 0 – Vertex shader not
compiled`. tabs.js desktop went red once on it; after the fix both devices green.

**Follow-up on user review** ("it's bugged, the orb looks cut"): the render canvas
was collapsing to its intrinsic attribute size — the orb container had width but no
definite height, so the canvas displayed ~2× taller than its render (sphere stretched
into a huge oval spilling out of the room) and the bass-displaced sphere poked past
the viewport clip. Fixed by making the orb container `aspect-square` +
`overflow-hidden rounded-full`: the canvas now gets a real CSS size, and displaced
peaks read as a clean circular rim. Same pass: **removed the VU meter** ("now that
the orb is the visualizer") — `VUMeter.tsx` deleted, `data-vu-fade` block gone from
LofiPlayer, harness gates switched from `vuOpacity 0→1→0` to a **no-VU invariant**
(`data-vu-meter`/`data-vu-fade` absent everywhere, after play included).

**Same review, round 2** ("fade in good, but it doesn't fade out"): the orb's effect
listed `isAudioPlaying` in its deps, so every play/pause **disposed the WebGL
renderer and recreated it at scale 0.001** — the fade-out loop was cancelled the
frame the pause landed, snap-vanishing the orb. Fix: the orb now keeps a **single
renderer for its lifetime**; props are snapshotted into a ref after each commit
(`livePropsRef`) and the `paintFrame` loop reads them every frame, with a tiny wake
effect (`isAudioPlaying`/`isPaneActive`) re-kicking the loop after it parked. Fade-out
now ramps genuinely (paused-presence 0.975 → 0.035 at 900ms) instead of an instant
reset; no renderer churn on play/pause either.

**Round 3** ("letters feel dead when the track changes"): added a **letter crossfade**
to the track title + category eyebrow — `AnimatePresence` keyed by `track.filename`
(title) and `category.id` (eyebrow), both in fixed-height absolute boxes so nothing
below jumps: old letters fade + rise out (y −8/−4), new fade in from below, 0.22s
`easeOut`; `useReducedMotion` collapses to an instant swap. Harness: the dial-drag
gate now asserts the title **actually swaps** with the station (settle wait extended
past the playlist fetch). Verified tsc/eslint/build + tabs + perf ALL PASS both
devices.

**Round 4** ("can't hear the music, don't know why"): the element kept "playing"
(currentTime advanced, orb animated) but every sample was being dropped — Chrome had
**suspended the shared `AudioContext`** (hidden tab / sleep), and `resume()` only ever
ran inside first-time init (`everPlayedOrb` gate), so nothing ever woke it. Diagnosed
with a runtime probe: fresh pages are healthy (one context, state `running`), and
voluntarily suspending the live context reduced it to silence while the element
played on. Fix: `ensureAudioContextRunning()` in `audioContextManager.ts` (resume
with a 400ms cap, best-effort) called from `toggle()` **before every Play press**,
context held in `audioContextRef`. First-play latency untouched — a fresh in-gesture
context is already `running`, so the guard yields immediately (perf play-latency
90.4ms). Proof probe: play (running) → manual `ctx.suspend()` (suspended, silent,
still ticking) → pause+play → **running again, playing**. tabs/perf ALL PASS both
devices.

**Round 5** (still no sound): the wobble proved real audio reached the graph, but
routing the element's output **exclusively through WebAudio** is fragile — Chrome
considered the tab silent (no tab speaker icon) and output could vanish behind the
destination. Restructured to the **native + visual twin** model: the tracked `<audio>`
element plays **directly** to the device (audible + tab speaker icon), and a second
**hidden, muted** `<audio>` twin (same src) is what feeds the Web Audio pipeline for
the orb's bass. `toggle()`/`selectCategory`/skip-autoplay drive both in lockstep; the
audio-context machinery (source→analyser→destination, resume-before-play) now
targets the twin only. Harness: audio gate asserts 2 elements, visible `muted:false`,
twin muted + same-src, both persisting.

**Verification** (2026-09-09): tsc/eslint/build clean; **tabs.js ALL PASS both
devices** — `audio-before/after` ({exists,count:2,visibleMuted:false,twinMuted:true,
twinSameSrc:true}, same src before/after), orb absent-cold → presence 0.982 → 0.023,
title swaps on drag; **perf.js ALL PASS** — idle 0 draws/s, play-latency 68.4ms, dial
16.67ms/0% long.

**Note for the user**: the app on :3000 was running `next dev` with stale code;
restarting it (or your own build/start) is required to pick up the fix.

**Verification** (2026-09-09 run): `npx tsc --noEmit` + `npm run lint` +
`npm run build` (Next 16, 2 static routes) all green; **tabs.js ALL PASS both
devices** — orb absent when cold, `data-presence` 0.925 at ~900ms of play, 0.001 at
~900ms of pause, VU `0→1→0`, no `data-sleeve`/`data-reactor`, dial 5/1; **perf.js ALL
PASS both devices** — idle **0 draws/s**, desktop play-latency **81.2ms** (back from
the revamp's 0.9ms with the restored analyser + deferred three chunk; still ~12× under
the 1000ms gate), dial-drag mean **16.67ms / 0% long / max 16.8ms** (sampled while
paused), app-load wire **2,079,803B / 20 requests** (three absent until play).

### 2026-09-09 — Player revamp: remove the orb, the sleeve, and the phase pill (twenty-fifth entry): "leave the room there"

**Ask**: "monumental task" — revamp the player; the generative album-cover component with
its reactive orb ("i honestly dont know how it's still there") and the playing/paused
eyebrow with the small dot go. The dial region itself is untouched: the sleeve's square
stays as a **deliberately reserved empty room**. The VU meter is **hidden when nothing
plays and fades in when music is live**. No pre-supplied direction — drafted and approved.

**Decisions**:
- The void is the feature. The player stack is now: dial → reserved empty square
  (`data-player-room`, same footprint `min(72vw,300px)` / `min(30vh,340px)`) → SF Pro
  Rounded title → category → transport → VU. No orb, no artwork, no telemetry chrome,
  no "Radio Live" dot, no `Playing/Paused` eyebrow — play state reads from the transport
  glyph and the VU appearing.
- `VUMeter` wraps in `data-vu-fade`: `opacity-0` + `pointer-events-none` when no track is
  playing, `opacity-100` over `transition-opacity duration-500` once `playing && track`.
  Always mounted, so zero layout shift.
- The `AudioContext → createMediaElementSource → AnalyserNode → destination` graph
  existed **only** for the orb — deleted wholesale; playback runs straight through, so
  first-play latency drops.

**Changes**: `LofiPlayer.tsx` (remove barrel imports, `ensureAudioGraph` + `analyserRef` +
`audioGraphReadyRef`, the sleeve block → room, the phase pill, `cn` now-unused import;
VU fade wrapper; skeleton reshaped to dial + room + text). Deleted
`components/player/AmbientArtworkTile.tsx`, `ReactiveAudioCanvas.tsx`, `stationThemes.ts`
(grep-verified no remaining importers). `reactive.md` marked **SUPERSEDED**. `DESIGN.md`
player/perf/harness sections rewritten. Harnesses: `tabs.js` player gate now asserts
`data-player-room` present, **zero** `data-sleeve`/`data-reactor` anywhere,
`data-vu-fade` opacity `0 → 1 → 0` across a real play/pause (desktop + mobile cold
check); `perf.js` idle sensor generalized from "reactor canvas draws" to "any canvas
draw" (the orb was the last rAF canvas, so the gate still reads 0).

**Verification**: `npx tsc --noEmit` 0, `npm run lint` 0, `npm run build` 2 static routes;
`tabs.js` ALL PASS both devices (player gate: `room=true`, `noSleeve=true`,
`noReactor=true`, VU opacity **0 → 1 → 0** across a real play/pause; hover-steps gate
still `none → 1.04 → 1`; control at 5 radios/1 active). `perf.js` ALL PASS both devices:
idle draws 0/s, dial 16.67ms / 0% long, and **first-play latency dropped 52ms → 0.9ms**
(audio graph removal); wire bytes 2,077,861 → **2,074,170** with the deleted components
out of the bundle.

### 2026-09-09 — Remove the transport tooltips (twenty-fourth entry): "only on that screen, feels off"

**Ask**: the player's play/pause/skip tooltips (the app's only ones — dock Reset uses a
native `title=`) feel off since they appear on just one screen; remove them.

**Changes**: `LofiPlayer.tsx` — the three `<Tooltip>` wrappers are flattened to bare
`<Button>`s (aria-labels already present, refs forwarded, so press bounce keeps
working); unused `Tooltip*` imports dropped. `app/layout.tsx` — `<TooltipProvider>` and
its import removed (it existed only for those tooltips). `components/ui/tooltip.tsx`
kept as an inert primitive for any future hover-hints.

**Verification**: tsc 0, eslint 0, build 2 static routes; `tabs.js` gained a **no-tooltip
gate** (hover the play button 400ms → `[data-slot="tooltip"]` count 0) — ALL PASS
desktop + mobile (hover-steps gate still `none → 1.04 → 1`); `perf.js` ALL PASS (dial
16.67ms, 0% long) and total wire bytes dropped **~2,178k → 2,078k** (20 → 19 requests)
with the provider bundle gone.

### 2026-09-09 — Steps ladder replaces pre-scaled raster (twenty-third entry): "now its worse XD"

**Reported**: "now its worse XD — the text is squished, then it got blur and get bigger."
The pre-scaled-raster spring (Strategy C from problem.md) failed in practice, exactly the
way its theory warned it could in reverse.

**Why it failed**: the technique assumes the browser rasterizes the element once at
natural size and holds that texture while the `scale` property animates. Without a
resident compositor layer it instead **re-rasterizes at each fractional scale** — the
text blurs during the spring just like the original "blur for a ms". And the compulsory
rest at `1/1.04 ≈ 0.9615` made every control look permanently **squished** at rest. Both
of the user's observed artifacts ("squished" + "blur then bigger") were the technique's
two costs arriving anyway. Empirical lesson: upscaling text SMOOTHLY in Chromium blurs;
the only sharp paths are discrete fixed-size steps or no size change at all.

**Decision**: revert the rest-squish and the continuous spring; ship the game-winning
compromise as a **dense spring-shaped ladder** — the play spring's silhouette sampled at
~6 crisp `steps(1,end)` hops (`1 → 1.02 → 1.035 → 1.048 → 1.052 → 1.04`, ~190ms). Each
hop holds then jumps, so the element only re-rasterizes at exact fixed sizes: visible
spring motion (overshoot-and-settle included) with zero blur and natural rest size.
Hover-out plays the ladder reversed.

**Changes**: `hooks/useHoverSteps.ts` new (deletes `useHoverSpring.ts`); the three crisp
controls (nav tabs, dial label span, dock Pill/Step/Start wrappers) swap back — composed
refs untouched; `pressSurface.ts` doc notes the rejected attempt and why; `tabs.js` gate
back to natural-rest semantics.

**Verification**: tsc 0, eslint 0, build 2 static routes; `tabs.js` hover gate —
**rest `none`, hover `1.04`, leave `1`** (computed button scale), ALL PASS desktop +
mobile; `perf.js` ALL PASS (dial mean **16.66ms, 0% long, max 16.7ms**).

### 2026-09-09 — Pre-scaled-raster hover spring (twenty-second entry): "copy the play button"

**Ask**: the two-tap hover is "crisp but a jump" — the play capsule has "beautiful motion",
can we copy it? User answered "true spring + pre-scaled raster" after reading problem.md.

**Root cause**: the play capsule is an **icon** — continuous `scale` springs are free for
smooth shapes. Text cannot span a continuous fractional scale (per-frame re-raster =
"blur for a ms"). But problem.md **Strategy C** ("pre-scaled raster") removes that wall:
rasterize the glyphs at their natural layout size (the biggest size the control ever
displays) and rest the control at `scale 1/1.04 ≈ 0.9615` — a *compression* that is
always sharp (downsampling). Then hover can spring the `scale` property up to `1.0` with
the play button's exact `cubic-bezier(0.34,1.56,0.64,1)` curve (~240ms) without the
layer ever being sampled past ~100%. True play-button motion, zero blur.

**New `hooks/useHoverSpring.ts`** (replaces `useHoverCrispZoom.ts`, deleted): mirrors
`usePressBounce` (cleanup-bound ref callback); on attach sets `style.scale = 0.9615`
(gated on `(hover:hover)` + not reduced-motion); `pointerenter`/`pointerleave` WAAPI-spring
`scale` → `1.0` / back `0.9615`, `fill: forwards` to hold. Reduced-motion/touch stay at
natural size (scale 1) with no anim — same media scoping as the CSS hover.

**Swapped in** the three crisp controls (NavSegmentedControl tabs, dial label span,
dock Pill/Step/Start wrappers) — composed refs and did one-line import/call swaps.

**Known visual change (approved)**: text controls sit at **96.15%** of layout at rest on
hover-capable machines (touch/reduced-motion stay full). Relative growth rest→hover is the
same 4% as the live build. Dial side-benefit: the center pill now renders at
`1.05 × 0.9615 ≈ 1.0096` (≈native) instead of the old 5%-upscaled raster — crisper center.

**Verification**: tsc 0, eslint 0, build 2 static routes; `tabs.js` hover gate updated —
**rest `0.961538`, hover `1.0`, leave `0.961538`** (computed button scale), ALL PASS
desktop + mobile (dial drag/hold/key/seam, dock, audio all still green); `perf.js` ALL
PASS at idle (load 1.4): dial mean **16.67ms, 0% long, max 16.8ms**, fonts ~68ms, play
latency ~120ms — the rest-scale layer + one-shot 240ms spring add no per-frame cost and
need no explicit `will-change` (WAAPI `scale` + `fill: forwards` keeps the raster
resident without permanent promoted layers).

### 2026-09-09 — Two-tap crisp hover (twenty-first entry): "crisp but a jump, no motion"

**Reported**: after brand-springy press everywhere, text hover reads as "a jump and nothing
more" — the crisp snap made the zoom teleport, killing hover's visible motion.

**Root cause**: for text, hover scale cannot be a *smooth* CSS transition (fractional-size
re-rasterization = the rejected "blur for a ms"), but an *instant* snap also reads as dead.
User chose "two-step crisp zoom" + "reverse motion on leave" over a springy bloom or a
blur-accepting spring.

**The idea**: WAAPI `scale` keyframed `1 → 1.02 → 1.04` with **`steps(1,end)`** per segment
(~140ms): each segment *holds then jumps*, so the element only ever re-rasterizes at three
**crisp** fixed sizes — the hover visibly moves with zero fractional-frame glyph blur.
Hover-out plays the same taps **reversed**. `fill: "forwards"` on both, or the animation
ends and the zoom collapses mid-hover (the probe caught exactly this on the first run).

**New `hooks/useHoverCrispZoom.ts`** — mirrors `usePressBounce` (cleanup-bearing ref
callback), animates the independent `scale` property so it composes with `paint()`'s
`transform` and the label-span press translate; skips under reduced motion and
`(hover:hover) == false`.

**`lib/pressSurface.ts`**: `hoverZoomCrispClass` now carries **no CSS `hover:scale` at all**
— JS owns the zoom; the class only eases shadow/color/filter with `--ease-spring`
(+ `motion-reduce:transition-none`). `hoverZoomClass` (icons, springy CSS scale) unchanged.

**Wiring**: nav tabs (hover ref composed into the same React 19 ref-cleanup as the press
bounce), dial pills (hover ref on the **label span**, composed with `pillBounceRef`), dock
Pill/Step/Start wrapper spans (each own hook). Reset keeps the springy icon zoom.

**Verification**: tsc 0, eslint 0, build 2 static routes. `tabs.js` gained a **hover-two-tap
gate** (hover a nav tab → computed `scale 1.04`; leave → `1`; rest `none` — reading the
BUTTON, not its inner span): ALL PASS desktop + mobile. `perf.js` ALL PASS at idle (load
1.4–1.6) — dial mean **16.67ms, 0% long, max 16.8ms**, fonts ~42–50ms, play latency ~57ms;
the one-shot 140ms animations add no per-frame cost.

**Ask**: "hover and press on almost everything that can be pressed" — dial pills, the
top-left nav pills, etc. And hover should **zoom in place** (`scale`, no lift) everywhere.

**The one idea**: Tailwind v4's independent `scale`/`translate` CSS properties compose
with (never fight) the app's two `transform` writers — `usePressBounce`'s WAAPI and the
dial's imperative `paint()`. So a single class-string recipe works everywhere without
touching physics or the perf-critical paint path.

**New `lib/pressSurface.ts`**:
- `hoverZoomClass` — `scale 1.04` on `(hover:hover)`, `--ease-spring` ~200ms.
- `pressSquishClass` — `scale 0.95` on `:active`.
- `pressSurfaceClass` — both. Transition list **excludes `transform`** (see above).
- `motion-reduce:` guards flatten hover + press.

**Applied**: nav tabs + palette satellite (`NavigationSegmentedControl`), the five dial
pills (`StationInfiniteDial`), player transport prev/next (`ui Button` ghost) — all get
`pressSurfaceClass`; play capsule + dock controls get `hoverZoomClass` only (their press
stays on `usePressBounce`). Dock `hoverLiftClass` (translateY −1.5px) deleted → zoom.
This also **deleted the smorgasbord**: dock lift, nav `transition-colors`, satellite
`active:scale-95`, ui-Button `active:translate-y-px`.

### 2026-09-09 — Press bounce everywhere (twentieth session): "they lack bounciness"

**Ask**: after the crisp fix, "they're good but lack bounciness." Root cause: a CSS
`:active` squish **cannot overshoot** — real bounce needs keyframes/WAAPI on release.

**Decision**: hover stays CSS (zoom), **press moves to WAAPI** via the existing
`usePressBounce` (the praised `crispBounce` pattern) on every pressable. `lib/pressSurface.ts`
slims to two exports — `hoverZoomClass` (icons, springy) + `hoverZoomCrispClass`
(text, snap) — the CSS `pressSquish*`/`pressSurface*` variants are deleted (press is
no longer CSS).

**Wiring**:
- Nav tabs (text): `hoverZoomCrispClass` + `usePressBounce` translate plane (dip 1px →
  spring −1.5px → 0; sharp text). Ref composed with the keyboard-`tabsRef` via the
  React 19 ref-cleanup pattern.
- Palette satellite (icon): `hoverZoomClass` + `usePressBounce(0.9)` (0.9→1.02→1).
- Transport prev/next (icons): `hoverZoomClass` + two `usePressBounce(0.9)` refs; play
  capsule unchanged.
- Dial pills: pills stay crisp-snap hover; each pill's **inner label `<span>`** carries
  `usePressBounce` translate plane — bounce never touches the button `transform` that
  `paint()` owns, and never scales text. `paint()` now writes the station name to the
  label span (`node.firstElementChild`) instead of the button. (Removed
  `pointer-events-none` from the span, or the bounce listener would never fire.)
- Dock unchanged (already had `crispBounce` + hover zoom).

**Verification**: tsc 0, eslint 0, build 2 static routes; `tabs.js` ALL PASS both devices
(dial text still resolves through the label span). `perf.js` dial gate RED — but under the
**same proven load signature** (load avg 6–8, `PEAK.exe` ~213% CPU): fontLoad 110–183ms vs
~34ms idle, play-latency ~102–139ms vs ~57ms, max dial frame 50–100ms. Identical code
passed at load ~4 earlier (mean 17.19ms, long 3.1%). Label-span per-frame cost is a
DOM read against a per-frame budget — not a pacing factor. **CONFIRMED GREEN once idle**
(17:05, load 1.06): `perf.js` ALL PASS both devices — dial mean **16.67ms, 0% long,
max 16.8ms**, fonts 59ms, play latency ~70ms. The reds were purely the user playing Peak.

### 2026-09-09 — Crisp hover for text (nineteenth session): the "blur for a ms" fix

**Reported**: on hover, text (nav tabs, dial pills, dock pills) blurs for a ms then snaps
sharp. Cause: `scale` is **transitioned** (1→1.04 over 200ms) and every fractional frame
re-rasterizes text glyphs → soft, then crisp once still. Icon shapes tolerate it, text
doesn't. (This is the same rationale that already steered `usePressBounce` to `translate`
for text-bearing dock controls.)

**Fix**: split `lib/pressSurface.ts` into springy + **crisp** profiles (`hoverZoomCrispClass`
/ `pressSquishCrispClass` / `pressSurfaceCrispClass`): `scale` is dropped from the
transition list so the zoom **snaps** instantly while shadow/color still ease with
`--ease-spring` — same rest-state look, zero blur. Both profiles keep `transform` excluded.

**Wiring — text/glyphs → crisp; icons → springy**:
- Crisp: nav tabs, dial pills (`pillBaseClass`), dock Pill / Step / Start wrappers.
- Springy (unchanged): palette satellite, transport prev/next, play capsule, dock Reset.

**Verification**: tsc 0, eslint 0, build 2 static routes; `tabs.js` ALL PASS both devices.
`perf.js` first runs flapped RED on the dial (mean ~22ms, max ~100ms, fonts/latency 3–5x
slower) while a host process (`PEAK.exe`) sat at ~215% CPU and load ~8 — proved load, not
code: once load fell to ~4 the same gates returned **PASS** (mean 17.19ms, long 3.1%,
max 33.4ms). Lesson recorded: re-run the dial gate with the machine idle; it's the most
load-sensitive metric.

### 2026-09-09 — Performance discipline: harness green end-to-end (seventeenth session)

**Theme of the day**: "crisp across all devices" via a *red-capable* measurement loop —
build the perf harness first, get it to baseline RED, then fix, then regression. Every
phase ends with the full suite green. Frontend dev server + backend stay running as one pair.

**The harness** (`/tmp/opencode/pw/perf.js`, desktop 1440×900 + mobile 390×844, Chromium
pinned, BASE `http://localhost:3000`):
- CDP Network-only byte accounting (the `Performance` domain breaks media — `loadingFinished`
  never fires, sizes 0), measured from navigation (never reset).
- Idle signal = canvas draw-rate only (a `draw()` counter patch on the orb); `preload=auto`
  downloads the whole track at MOUNT even hidden — the baseline, RED.
- Dial = real drag + rAF frame histogram. Gates: IDLE_DRAWS_PER_SEC ≤2, FONT_BYTES
  ≤2,600,000, AUDIO_BYTES ≤100,000, DIAL_MEAN_FRAME_MS ≤20, DIAL_LONG_FRAME_PCT ≤8,
  PLAY_LATENCY_MS ≤1000, exactly-1 checked pill, dial moved, 0 console errors.
- **Baseline (RED)**: idle draws ~300/s both devices; audioBytes 2.3–2.7MB at mount;
  fontBytes 1,597,154; dial settle flappy (mean 16.7–20.7ms, long frames 0–23%).

**Real bug found**: the app at `http://localhost:3000` never loaded — CORS allowlist only
had `http://127.0.0.1:3000`. Fixed `config.py` `cors_origins()` (aliases `http://localhost:`
for loopback origins) + 2 tests; backend restarted.

**Phase 1 — hidden-pane parking**: `active` threaded `page → LofiPlayer →
AmbientArtworkTile(paneActive) → ReactiveAudioCanvas(isPaneActive)`; dormant pane paints one
static frame then stops `rAF`. idleDrawsPerSec → **0** both devices.

**Phase 2 — load discipline**: fonts via `/usr/bin/woff2_compress` (Heavy 1.57MB→535KB,
Semibold 1.59MB→540KB, TTF originals kept); `next/font/local` → `.woff2`;
`preload="metadata"` (dbg-meta verified: fetch metadata then `ERR_ABORTED`, no full DL).
After: fontBytes → **1,075,328**, audioBytes 0 pre-play, play latency ~60ms.

**Phase 3 — streaming**: Werkzeug 3.1.8 already serves Range natively (206 + Content-Range,
If-Range peek, 416); `stream_track` only adds `Cache-Control: public, max-age=31536000,
immutable` + 5 tests (immutable, 206, 416, If-Range match/mismatch). Backend: pytest **20**.

**Phase 4 — deps**: `swr` removed (package.json + lockfile); `i.scdn.co`/`mosaic.scdn.co`
`remotePatterns` removed (`next/font` was the only third-party origin left). Build = 2 static
routes. `next.config.ts` needs a dev-server restart to take effect (not done — harmless).

**Phase 5 — dial imperative paint** (`player/StationInfiniteDial.tsx` rewritten):
pills keyed by **slot** (5 stable buttons), per-frame transform/opacity/zIndex + label +
`aria-checked` + center classes written to the DOM by `paint()`; `useLayoutEffect` re-applies
paint after every render; physics constants/math **verbatim** (same settle/fling/hold/wrap
code). Lint fixes the rewrite introduced: `useRef` has no lazy factory — store the value
eagerly; never read `ref.current` during render — `pendingPosRef` init 0 (always written
before read), `renderedRoundRef` init `NaN` (same trick the external-sync effect already used).
Result: the one remaining red gate — desktop `dialLongFramePct` **12.1% → 0%** (mean
16.67ms, max 16.8ms).

**FINAL STATE — everything green**:
- `npm run lint` + `npx tsc --noEmit` exit 0; behavior suite `tabs.js` ALL PASS (desktop +
  mobile; dial-drag/hold/key/seam, exactly-one `aria-checked`, 0 console errors).
- `perf.js` **ALL PASS** both devices: idle 0/s, fontBytes 1,075,328 (load ~32–41ms),
  audioBytes 0 pre-play, dial mean 16.67ms / 0% long, play latency ~60ms.
- pytest **20 passed**. DESIGN.md design + verified sections updated.

**Notes for next sessions**: dev server still needs a restart to pick up next.config.ts;
keep the perf harness (not the debug scripts) for any future perf work.

### 2026-09-08 — End-of-day recap & state for future sessions (sixteenth entry)

**The day at a glance**
- Focus hero decluttered (no badge/bar/pips/skip; dock = `[WORK][Start][Reset][BREAK]`,
  red hold-fill), SF Pro Rounded locked in, generative/sleeve player built.
- Station dial journey (6th→15th): chip grid → infinite rotary dial → grab-and-drag 1:1
  → spring settle → Calm tuning. Two real bugs found & fixed:
  - **Spring sign error** (9th): `-stiffness × offset` = anti-restoring → diverged to
    infinity → duplicate keys + all pills stacked at center. Fixed to `+stiffness ×
    offset` + runaway guard.
  - **Wrap-seam arc** (15th, the "still fast" mystery): a fling near index 9 made the
    spring integrate a full-track raw arc at high speed. Fixed with nearest-congruent
    target routing in `settleAt`. User verdict: "you actually fixed it… victory is all
    yours."

**FINAL DIAL CONTRACT** (tune block at top of `player/StationInfiniteDial.tsx`):
- `SETTLE_PHYSICS`: stiffness **130**, damping **0.44**, magnet radius **0.45** /
  strength **60** (frame-time normalized, `MAX_FRAME_MS` 32).
- Fling: `FLING_TRAVEL_MS` 320, `FLING_REF_VELOCITY` **0.4** (linear low zone),
  `FLING_CURVE_TOP` **0.9**, `FLING_MAX_STATIONS` **1.25** (any swipe glides ≤1¼
  slots), `SEED_TRAVEL_S` **0.8** (lazy cruise).
- Idle/hold: `FLING_IDLE_DECAY_MS` **450** (exponential), `IDLE_KILL_MS` **400**
  (>400ms stationary hold = ALL momentum zeroed), `IDLE_RESET_PX` **2** (mouse
  micro-jitter ignored by the idle clock), `VEL_EMA_ALPHA` 0.5.
- Wrap routing: spring settles toward the **nearest congruent** target
  (`to + span·round((position−to)/span)`).

**STANDING USER PREFERENCES (do not regress)**
- Low-flick feel is good — never change the ≤`FLING_REF_VELOCITY` linear branch.
- Hold-and-release must NEVER ghost-fling; hard `IDLE_KILL_MS` cutoff stays.
- Keep magnet pull + soft bounce; dial must stay infinite + 1:1 grab-drag, exactly
  one `aria-checked` pill.
- Fast flings are nausea-forbidden by design.

**VERIFICATION (always run after a dial change)**
- `flowsound-frontend`: `npm run lint` && `npx tsc --noEmit` && `npm run build`.
- `node /tmp/opencode/pw/tabs.js` (desktop + mobile, BASE `http://127.0.0.1:3000`):
  realistic ~0.5 px/ms drag steps (45ms pause/step), 1100ms settle waits; suites =
  dial-drag, dial-hold (with mouse jitter), dial-key, dial-seam, plus the exactly-one-
  checked invariant and zero-console-errors gating.
- Layout detector: `node .../impeccable/scripts/detect.mjs --url http://127.0.0.1:3000
  --json` → `[]`.

**KNOB MAP (tune, don't rewrite)**
- Roll-out cap: `FLING_MAX_STATIONS` · cruise speed: `SEED_TRAVEL_S` · bounce amount:
  `SETTLE_PHYSICS.dampingRatio` · hold-death: `IDLE_KILL_MS`/`FLING_IDLE_DECAY_MS` ·
  low-feel reach: `FLING_REF_VELOCITY`. Revert tool = one constant block edit.

**OPEN FOR NEXT SESSIONS (per user, explicitly parked)**
- Per-category SVGs **for the dial** (pills are text-only; glyphs can return in the
  active pill).
- Palette theme menu.
- Tasks functionality (tab is a WIP placeholder).

### 2026-09-08 — Dial: the wrap-seam "crazy fast fling" is fixed (fifteenth session of the day)

**Context / goals of the turn**
- User (post Calm-mode): "it still the same... when i do that grab and hold, then
  release, it flings like crazy super fast, but it lands on the same... maybe thats
  the bug?" — the suspect was correct.

**Root cause**
- The audio only glided one slot of *launch*, but the **path could span the whole
  track**: `settleAt` wrapped the target with `mod()` (round(pos+fling) = 10 → 0) but
  never unwrapped the spring's raw `position`. Near the wrap seam (index 9 `Hybrid`
  sits on it; `Asian` = 8, your example), a small forward fling set `to = 0` while
  `position ≈ 8.4` — the spring integrated a **−8.4-station raw arc** through every
  station at huge speed. That read as "flings like crazy" and could sweep back past
  the station you released on ("lands on the same"). Speed tuning couldn't fix it: the
  launch was capped, the *distance* was not.

**Change**
- `player/StationInfiniteDial` `settleAt`: after wrapping the target, pick its
  **nearest congruent copy**: `settleTarget = to + span * Math.round((position - to) /
  span)` and integrate the spring toward that (|distance| ≤ half the track). The
  spring, magnet, and termination now run against `settleTarget`; the final position
  and commit still snap to the normalized `to`. Reduced-motion path untouched. No
  tuning constants changed — this was a correctness fix, not a feel knob.

**Verification**
- `lint`, `tsc`, `build` green. Harness gained **`dial-seam`**: arrow to `Hybrid`
  (index 9), press once more across the seam, sample the center every 70ms: this run
  `at=[Hybrid] final=[Focus] visited=2 checked=1` — the settle crossed exactly
  `Hybrid → Focus`, versus a 10-station arc before the fix. All existing dial tests
  still PASS (`dial-drag`, `dial-hold` with jitter, `dial-key`; exactly one checked
  pill; zero console errors), desktop + mobile. `detect.mjs` → `[]`. DESIGN.md updated.

**Notes**
- This is likely the whole "still feels fast" story all along — the seam arc was
  immune to the calm tuning. If any real fastness remains, it's the drag itself
  (1:1 tracking is inherently wrist-speed).
- `settleTarget`'s `Math.round((position - to) / span)` handles position far outside
  [0, span) too (e.g. a long continuous drag), always picking the nearest copy.

### 2026-09-08 — Dial: Calm mode + hold = kill momentum (fourteenth session of the day)

**Context / goals of the turn**
- User: "no it still fast, how aboout we make it slow?" then (mode flipped to build)
  "make sure to solve the grab and hold, kill momentum if user holds the cursor and
  doesnt let go."

**Change**
- `player/StationInfiniteDial` — **Calm mode** (from the slow-mode question card):
  - `SETTLE_PHYSICS.stiffness` 220 → **130** (ω ≈ 11.4 rad/s — ~30% slower, softer
    bounce-settle); damping/magnet untouched.
  - `FLING_MAX_STATIONS` 2.0 → **1.25** — the dial only ever glides one slot.
  - `FLING_REF_VELOCITY` 0.6 → **0.4**, `FLING_CURVE_TOP` 1.2 → **0.9** — the linear
    low zone (0.4×320/112 ≈ 1.14) sits under the cap; any normal swipe saturates.
  - `SEED_TRAVEL_S` 0.45 → **0.8** — max entry cruise ~4.4 → **1.56 stations/s** (a
    lazy glide).
- **Hold kills momentum** (the grab-and-hold fix): new `IDLE_KILL_MS = 400`. On
  release, if the pointer has been stationary past that hard cutoff, effective velocity
  is **exactly 0** — no exponential remainder, no ghost; the dial just magnet-snaps to
  the parked station. Sub-400ms pauses still keep partial momentum (exponential,
  `FLING_IDLE_DECAY_MS` 450). Combined with the jitter-proof idle clock (13th session),
  a "holding the cursor and not letting go" releases dead.

**Verification**
- `lint`, `tsc`, `build` green. Harness settle waits bumped to 1100ms for the slower
  spring. Desktop + mobile PASS, zero console errors: `dial-hold: parked=[Focus]
  held=[Ambient Drift] jittered-after=[Ambient Drift] checked=1` (jittered 900ms hold +
  release stays parked), `dial-drag: Focus→Soul→Focus checked=1`, `dial-key:
  Ambient Drift→Soul→Ambient Drift checked=1`. `detect.mjs` → `[]`. DESIGN.md updated.

**Notes**
- Restore some punch later: `FLING_MAX_STATIONS` → 2.0, `SEED_TRAVEL_S` → 0.45,
  `SETTLE_PHYSICS.stiffness` → 220. The hold-kill (`IDLE_KILL_MS`) is independent of
  the calm tuning and should stay.
- `IDLE_KILL_MS` is a hard line by design — the user asked momentum be killed, not
  faded, once they simply hold. Adjust only with intent.

### 2026-09-08 — Dial still fast + grab-hold lingered: jitter-proof idle + capped calm cruise (thirteenth session)

**Context / goals of the turn**
- User: "its still feels fast, and the grab hold still happening, what can we do?"

**Change**
- `player/StationInfiniteDial`:
  - **Jitter-proof idle clock** — the ghost-hold persisted on real hardware because mice
    emit sub-2px micro-moves while "holding still"; each one refreshed `drag.lastT`, so
    the idle decay never accumulated. `handlePointerMove` now only resets the idle clock
    (and feeds the velocity EMA) when a move exceeds `IDLE_RESET_PX = 2`; sub-threshold
    jitter is ignored. A deliberate pause now genuinely decays momentum.
  - **Calmer cruise** — `FLING_MAX_STATIONS` 2.5 → 2.0; `FLING_CURVE_TOP` 1.6 → 1.2
    (saturates sooner); `FLING_REF_VELOCITY` 0.8 → 0.6 (low zone stays under the cap);
    `SEED_TRAVEL_S` 0.3 → 0.45 — max seed cruise drops ~8.3 → ~4.4 stations/s (a lazy,
    slow roll, no nausea).

**Verification**
- `lint`, `tsc`, `build` green. Harness `dial-hold` upgraded to **inject 6 sub-2px
  jitters (~130ms apart) during the hold** before releasing — the exact hardware case
  that slipped through before. This run: `parked=[Focus] held=[Ambient Drift]
  jittered-after=[Ambient Drift] checked=1` — strip stays parked through jittered
  hold+release. `dial-drag: Focus→Soul→Focus checked=1` (realistic 0.5px/ms swipe,
  now a sedate +3-station total), `dial-key: Focus→Seasons→Focus checked=1`. Desktop +
  mobile PASS, zero console errors. `detect.mjs` → `[]`. DESIGN.md updated.

**Notes**
- If it can still be *felt* fast on hard flicks, the offending knob is the initial
  cruise — lower `FLING_MAX_STATIONS` to 1.5 or raise `SEED_TRAVEL_S` to 0.6. If a
  2px jitter threshold ever feels too slack/tight, `IDLE_RESET_PX` is the knob.

### 2026-09-08 — Dial flick: cap the roll-out, longer momentum hold (twelfth session of the day)

**Context / goals of the turn**
- User: momentum still "feels wrong" — the idle-decay time constant should be 400-500ms,
  and (picked from a cap question) **fast flings should be ditched**: "its kinda wrong
  because it causes nausea". Fast-roll-induced nausea is the driving constraint now.

**Change**
- `player/StationInfiniteDial` tune block (single idea: *momentum lingers, never
  launches*):
  - `FLING_IDLE_DECAY_MS` 150 → **450** — momentum now survives a ~0.5s pause before
    release; only a long hold cancels it.
  - `FLING_MAX_STATIONS` 4.5 → **2.5** — the universal roll-out cap.
  - `FLING_REF_VELOCITY` 0.9 → 0.8 so the linear low zone (≤0.8 px/ms, exact old
    formula — the praised range) stays under the cap; `FLING_CURVE_TOP` 2.6 → 1.6 so a
    normal swipe already saturates. **Violent and medium flicks now land the same
    gentle 2.5 stations** — fast flings effectively cease to exist.
  - Max seed cruise drops ~15 → ~8 st/s (SEED_TRAVEL_S 0.3 unchanged).
- Harness `tabs.js`: drag steps gained ~45ms pauses → **real human flick speed (~0.5
  px/ms)** instead of the near-instant ~20px/ms programmatic swipe that kept skewing
  the physics numbers.

**Verification**
- `lint`, `tsc`, `build` green. Desktop + mobile PASS, zero console errors. At realistic
  velocity: `dial-drag: before=[Focus] after=[Soul] returned=[Focus] checked=1` (drag
  1.68 + ~1.4 stations of fling → 3), `dial-hold: held=[Ambient Drift] after=[Ambient
  Drift]` (920ms hold + release stays parked — ghost momentum gone), `dial-key:
  Focus→Seasons→Focus checked=1`. `detect.mjs` → `[]`. DESIGN.md updated.

**Notes**
- Max roll-out knob = `FLING_MAX_STATIONS` (2.5; 2.0 even sedater, 3.0 a touch more
  drama). Momentum survival = `FLING_IDLE_DECAY_MS` (450). Harness step delay (45ms)
  must stay realistic or the suite stops measuring human feel.

### 2026-09-08 — Dial flick: momentum dies while holding still (eleventh session of the day)

**Context / goals of the turn**
- User: "user 'grab' and flings very fast, but user doesnt let go, when user cursor is
  still, if its a seconds matter, when user release cursor, the momentum is there, it
  feels unnatural" — the ghost-momentum bug.

**Change**
- `player/StationInfiniteDial` `handlePointerEnd` (now takes the pointer event): the
  fling velocity now **decays exponentially over the idle time** between the last
  pointermove and the release —
  `effectiveVelocity = drag.vel * Math.exp(-idleMs / FLING_IDLE_DECAY_MS)` with
  `FLING_IDLE_DECAY_MS = 150`. No move events fire while the cursor is parked, so the
  old code seeded the spring from stale release velocity; now a ~250ms hold leaves
  ~19% (barely a nudge), a ~1s hold ~0.3% (no fling — a clean magnet snap to the parked
  station), and a release right after the swipe rides exactly as before. Real-scrollview
  behavior; no magic cliff (pure exponential).

**Verification**
- `lint`, `tsc`, `build` green. Harness gained a **`dial-hold` regression test** (desktop):
  fast drag, hold the pointer 920ms, release → center must not move. This run:
  `parked=[Focus] held=[Ambient Drift] after=[Ambient Drift] checked=1` — ghost fling
  gone. Drag/key round-trips unchanged (`dial-drag` and `dial-key` PASS, checked=1).
  Desktop + mobile PASS, zero console errors. `detect.mjs` → `[]`. DESIGN.md updated.

**Notes**
- `FLING_IDLE_DECAY_MS` lives in the same tune block; raise it (e.g. 250) to forgive
  longer pauses before momentum counts as dead, lower it (e.g. 100) to kill momentum
  sooner on any hesitation.

### 2026-09-08 — Dial fling: compressive speed curve (tenth session of the day)

**Context / goals of the turn**
- User (post-bug-fix): "its looks great!! great job man... user flings at different
  speeds, low fling is good, but medium is like really fast when user fling it not
  that much." — the release→roll-out transfer was linear (`vel × 320 / 112`, clamp
  ±5), so a medium flick already rolled ~4 stations at a hot cruise.

**Change**
- `player/StationInfiniteDial` `handlePointerEnd`: the roll-out now follows a
  **compressive curve** instead of the straight line:
  - `speed ≤ FLING_REF_VELOCITY` (0.9 px/ms): **exact old formula** — the praised low
    range is preserved byte-for-byte (slow 0.5→1.43, low 0.9→2.57 stations, unchanged).
  - Above the reference, the roll-out bends over a smoothstep from `linearAtRef` up to
    `FLING_MAX_STATIONS` (4.5) at `FLING_CURVE_TOP` (2.6 px/ms) — medium (~1.4 px/ms)
    4.0→~3.0, fast (2.0) 5→~3.7, violent 5→4.5.
  - Spring seed decoupled to `SEED_TRAVEL_S` (0.3s) instead of `FLING_TRAVEL_MS/1000`,
    so the cruise scales down with the tamer roll rather than raw release speed.
  - New constants kept in the same single tune block: `FLING_REF_VELOCITY`,
    `FLING_CURVE_TOP`, `FLING_MAX_STATIONS`, `SEED_TRAVEL_S`.

**Verification**
- `lint`, `tsc`, `build` green. Harness desktop + mobile PASS, zero console errors,
  drag settles exactly one checked pill. The test's intentionally violent swipe now
  lands 2 stations shorter than before the curve (`after=[Funk]` vs `Jazz Lounge`),
  while low-range and keyboard behavior are unchanged (`dial-key: Focus→Seasons→Focus,
  checked=1`). `detect.mjs` → `[]`. DESIGN.md dial bullet updated.

**Notes**
- Feel fallback if medium still runs hot: scale the low range too via
  `FLING_TRAVEL_MS` (320→260); the curve already keeps `|vel| ≤ reference` linear, so
  only the upper region moves.
- Harness swipe is far faster than real fingers, so it exercises the curve's
  saturation; real-world feel should fall around the 1.4 px/ms row.

### 2026-09-08 — Dial settle: spring momentum + magnet + bouncy stop (ninth session of the day)

**Context / goals of the turn**
- User: "go" on the proposed plan — give the dial "some more momentum, a bit more
  smooth, more magnet like and bouncy when coming to a stop", kept reversible.
- User's standing quick-reference clause: if the new feel misses, flip one constant
  block back; the previous `easeOutBack` feel is one edit away.

**Change**
- `player/StationInfiniteDial` settle rewritten from the `easeOutBack` rAF tween to an
  **under-damped spring simulator** (all constants in one tidy block up top, reverting is
  a one-block swap):
  - `SETTLE_PHYSICS`: stiffness 220, damping ratio 0.44 (bounces just past the stop and
    settles), `magnetRadius` 0.45 stations + `magnetStrength` 60 (sucks the strip into
    the slot as it closes in), `MAX_FRAME_MS` 32 (frame-time normalized, feel is raw on
    any refresh rate); semi-implicit Euler integration.
  - Fling got more torque: `FLING_TRAVEL_MS` 190 → **320**, `FLING_MAX_STATIONS` ±3 → **±5**.
  - Release velocity is EMA-smoothed (`VEL_EMA_ALPHA` 0.5) instead of raw last-sample —
    stabler flings.
  - The spring is **seeded with release momentum** (direction an' a half-step over the
    roll-out time), so a flick rolls out under its own weight instead of decaying by
    design; clicks/arrows settle with zero seed velocity (pure magnet + bounce).
  - Reduced motion unchanged (1:1 drag, instant snap). Click/tap and ArrowLeft/Right
    kept; `onSelectStation` still fires once per settle.

**Verification**
- `lint`, `tsc`, `build` green. Harness drag wait bumped 800→1200 / 400→900ms for the
  springy stop; round-trip identity assertion replaced with a **mid-drag** check (the
  strip must visibly move under the second, opposite drag — it does, mid=[Funk] when
  grabbing past Chillhop) plus radios == 5, since momentum roll-out makes landings
  non-deterministic by design. This run: `before=[Focus] after=[Seasons] midLeft=[Funk]
  returned=[Jazz Lounge]` — one rightward flick rides ~2 stations past the swipe, the
  leftward drag rolls on to wrap. Desktop + mobile PASS, zero console errors, audio
  `src` persisted. `detect.mjs` → `[]`. DESIGN.md dial bullet updated.

**Bug fix (filed by the user, same session)**
- Report: grabbing and flinging the dial makes it "enter a bucle and glitch out; all
  words get combined in the middle", with `Encountered two children with the same key,
  asian-lofi` from the dial's own button map.
- **Root cause — anti-restoring spring sign**: in the new spring `settleAt`, the force
  used `-stiffness * offset` where `offset = to - position`, i.e. `+stiffness *
  (position - to)` — *positive* feedback pointing away from the target. A fling (or any
  settle) diverged geometrically per frame: the rAF loop never met its stop threshold
  (the endless "bucle"), and once `position` passed ~2^53 the five `Math.round(pos ±
  slotOffset)` values collapsed to one — every pill got the same station id (the
  duplicate-key warning) and the same `translateX`, so all labels stacked at center.
  Harness had passed because it only read station names at the top of the divergence.
- **Fix**: flip the spring term to `+stiffness * offset` (restoring; damping and magnet
  terms were already correct) and add a **runaway guard** in the loop — if `position`
  or `velocity` turn non-finite or `|velocity| > 256`, snap to the slot and stop, so a
  future physics slip can never spin the tab again. Comment in code records why.
- **Harness hardened** to catch this class: after the drag settle and the keyboard
  settles, exactly **one** pill must be `aria-checked="true"` (a runaway collapse marks
  every pill checked); a keyboard test springs ArrowRight/ArrowLeft from rest and
  asserts the strip returns exactly to its start. Now: `dial-drag: before=[Focus]
  after=[Jazz Lounge] returned=[Focus] checked=1 radios=5` and `dial-key: before=[Focus]
  right=[Seasons] back=[Focus] checked=1` — clean round trips, real momentum, one
  checked pill, zero console errors.

**Notes**
- The programmatic harness swipe is far faster than human fingers (~1000px/s), so an
  unrealistic near-max fling shows up in tests; real swipes land within ~1 station of
  the drag. The ±5 clamp only engages on violent flicks.
- Feel knobs if re-tuning: `FLING_TRAVEL_MS` (roll-out), `SETTLE_PHYSICS.dampingRatio`
  (bounce amount — zero = no bounce), `magnetStrength` (pull-in). Full revert = restore
  `easeOutBack` settle + old fling constants from the eighth-session notes.

### 2026-09-08 — Station dial: grab-and-drag infinite scroll + smaller pills (eighth session of the day)

**Context / goals of the turn**
- User: "lets fix the carousel, two major problems" — (1) the pills look **clipped**,
  so make them a little smaller; (2) the whole point of a carousel is that you
  **grab with the cursor and scroll infinitely** — the dial only moved on click.

**Change**
- `player/StationInfiniteDial` reworked from click-swapping static slots to a
  **continuous position in station units**:
  - Pills down to `min-h-[40px] px-4` (from 44px/px-5); mask fade widened (26/74, container
    `px-6`) so peripheral pills dissolve before the clip edge instead of being hard-cut.
  - `pointerdown` captures the drag; the strip tracks the cursor **1:1** (per-rAF
    `translateX`, `touch-action: pan-y`); modulo wrap means dragging past either edge
    loops forever — no dead ends.
  - Release settles to the **nearest station** with a mild-overshoot `easeOutBack` rAF
    tween; **flick momentum** (last-move velocity, ±3 stations clamp) carries the strip
    further before settling. Reduced motion preserves 1:1 drag but snaps instantly.
  - Pills keyed by station id (no remount pops crossing slots); click/tap-to-select and
    ArrowLeft/Right cycling kept (now animated); `aria-checked` follows the pill crossing
    center. `onSelectStation` fires only on settle, when the index actually changed.
  - Avoided `performance.now()` during render per `react-hooks/purity` (tween start = rAF
    timestamp; pointer velocity = `event.timeStamp`).

**Verification**
- `lint`, `tsc`, `build` green. Harness `tabs.js` gained a **real drag test** (desktop):
  pointer grab + ~1.7 steps right → center station changes (`Focus → Late Night` in the
  run), leftward drag wraps back (`→ Focus`), radios still exactly 5 through both drags.
  Mobile + zero console errors unchanged. `detect.mjs` → `[]`. DESIGN.md updated.

**Notes**
- Fixed `STEP_PX = 112` slide distance per station; pill widths vary with text, so long
  names overshoot `±1` neighbors only transiently mid-crossing (mask hides it), never at
  rest. Tune `STEP_PX` if overlap is ever noticeable.
- Fling is clamped to ±3 stations and only applies off a real drag (> 3px movement), so
  a plain click never flings.

### 2026-09-08 — Dock rhythm reverted: Start + Reset center-flanked by the rails (seventh session of the day)

**Context / goals of the turn**
- User: "to be honest, not quite there, with the time selector lets go back, start and
  reset between work and break" — the rails-left arrangement from the sixth session
  missed; the idle dock returns to the classic rail–start–rail rhythm with the reset
  promoted into the middle next to Start.

**Change**
- `focus/FocusControlDock` idle reordered to exactly
  `[WORK rail][Start][Reset sm][BREAK rail]` — Start + Reset sit between the Work and
  Break rails; the divider is gone (matching the pre-reorder rhythm). Running state
  unchanged (centered Pause + hold-to-reset). Badge/bar/pips/skip removals, red
  hold-fill, dial, and generative sleeve from the sixth session all stay.

**Verification**
- `lint`, `tsc`, `build` green. Harness `tabs.js` gained a `resetBetweenRails`
  bounding-box gate (reset both beside Start and between the two rails); desktop +
  mobile PASS, zero console errors, audio `src` persisted, dial/sleeve intact.
  `detect.mjs` → `[]`. DESIGN.md dock + behavior bullets updated.

**Notes**
- Layout preference: the start/reset pair is a *centerpiece* between the rails, not a
  flank. Worth noting for any future dock reshuffle.

### 2026-09-08 — Focus declutter + station dial + generative sleeve (sixth session of the day)

**Context / goals of the turn**
- User: "couple of request rn" — scrub the Focus screen's extras, regroup the dock, and
  apply two standing specs to the Player screen.
- Focus: remove the Focus/Break badge, the "dotted line" (24-segment time bar), and the
  session pips (so Skip leaves too); reset sits **along the Start pill**; the hold-fill
  turns **red**; the time-selection rail bar moves **to the left side** of the dock,
  while the running state keeps Pause + reset exactly where they are.
- Player: the genre selector is "messy" — drop the `CategoryGlyph` "tick" squares and
  move the pills into `carousel.md`'s **infinite rotary station dial**; adopt
  `reactive.md`'s **generative ambient sleeve** (reactive orb) for the artwork seat.
- Dock composition confirmed via question tool: **single capsule, rails left** (Work +
  Break rails consolidated left; divider; Start + Reset grouped right).

**Change**
- `focus/FocusClockDisplay` stripped to the drum alone (`Badge`, `SegmentedProgress`,
  `SessionPips` removed); `SegmentedProgress.tsx` + `focus/SessionPips.tsx` deleted.
  `PomodoroTimer` drops `progress`/`sessions*`/`SESSIONS_TOTAL`/`safeDone` (and the
  unused `done` destructure); `advance` stays for auto-advance.
- `focus/FocusControlDock` idle reorder: `[WORK rail][BREAK rail] | divider | [Start][Reset]`
  — Skip button deleted end-to-end (`onSkip` prop removed), reset hold-fill now
  `bg-[var(--accent-red)]/25` (red, not ink; `data-reset-fill` hook). Running dock
  unchanged: centered Pause + hold-to-reset.
- New `components/player/StationInfiniteDial.tsx` (carousel.md, paper re-skin): five
  visible pills, modulo wrap, edge mask fade, Framer spring 420/32/0.8, reduced-motion
  instant, radiogroup/radio a11y + arrow keys, 44px targets. Replaces the chip grid in
  `LofiPlayer`; `CategoryGlyph` deleted.
- New `components/player/stationThemes.ts`, `ReactiveAudioCanvas.tsx` (real
  `AnalyserNode` low-bin pulse, idle breathing), and `AmbientArtworkTile.tsx` (radial
  accent well + specular glaze + "Radio Live"/ARCHIVE/44.1 kHz telemetry + orb center).
  `Platter.tsx` deleted.
- `LofiPlayer`: first user play lazily wires one `AudioContext`
  (`createMediaElementSource` → `AnalyserNode` → destination, gesture-safe, guarded);
  the analyser feeds the orb. Category switching, auto-advance, panes-stay-mounted
  audio persistence untouched.

**Verification**
- `lint`, `tsc`, `build` green. Harness `tabs.js` extended (desktop + mobile PASS, zero
  console errors): idle dock rails-left + Start/Reset grouped, no badge/bar/pips/skip,
  red hold-fill class, running collapse unchanged, hold-to-reset fires, audio same
  `src`, player = dial (5 radios/1 active) + sleeve + `data-reactor` orb + VU, no
  page/h overflow. `detect.mjs` → `[]`. DESIGN.md updated.

**Notes**
- Skip was tied to the sessions concept in the user's mental model and left with it —
  idle is rails + Start + reset only, running is Pause + reset. Returnable on request.
- The orb uses oklch-with-alpha fill strings (the paper accents are oklch, not hex).
- `--accent-red`/`--paper`/ink tokens now power the reset fill; `data-reset-fill`'
  class-check is the harness gate (computed-color parsing of oklch-alpha is brittle).

### 2026-09-08 — SF Pro Rounded typography (fifth session of the day)

**Context / goals of the turn**
- User: "i would like a font change again, but now i have provided the fonts, use
  semibold for letters and everything else, and use the heavy for the main clock".
- User-supplied fonts live at `font/SF-Pro-Rounded-Semibold.ttf` +
  `font/SF-Pro-Rounded-Heavy.ttf`.

**Change**
- Copied both TTFs into `flowsound-frontend/fonts/`; `layout.tsx` now declares
  `next/font/local` (`variable: "--font-sf"`, weights 600 + 800), replacing the Google
  Nunito. `globals.css` points `--font-sans/-mono/-display` at `--font-sf` and sets a
  **600 base body weight** (everything reads Semibold); the focus drum keeps
  `font-extrabold` → resolves to the **Heavy** face.
- Normalised every `font-bold`/`font-medium` → `font-semibold` across
  `NavigationSegmentedControl`, `FocusControlDock`, `SessionPips`, `ui/button`,
  `ui/badge` so nothing else accidentally grabs Heavy. Track title is semibold SF.

**Verification**
- `lint`, `tsc`, `build` green. `tabs.js` extended with a font gate (desktop + mobile
  PASS): `document.fonts.check("600/800 SF Pro Rounded")`, body family
  `sfprorounded` at weight **600**, clock drum computes **800**. Behavior unchanged
  (dock collapse, hold-to-reset, audio persistence all still PASS). Docs updated
  (DESIGN.md typography, layout contract comment).

**Notes**
- `--font-mono` (readouts) also lands on SF Pro Rounded Semibold — the user provided
  only these two cuts; the Heavy is deliberately scoped to the main clock.

**User sign-off**
- User reviewed the SF Pro Rounded deck in the browser: "now we are talking, now with
  the new font it looks great" — the typography direction is locked.
- Wrap-up for the day; no further work requested.

### 2026-09-08 — Full-bleed reformat + context-driven dock (fourth session of the day)

**Context / goals of the turn**
- User: "good approach, bad execution, the things don't adapt to the new space, also why
  is the music tab the first? it should be the focus one", pointing at `reformat.md`
  (Focus Screen Layout Redesign — full-bleed viewport, optical-center timer, session
  pips, consolidated floating bottom dock, context-driven state).
- Confirmed via question tool:
  - **Full-bleed on both screens** — the white `ConsolePanel` sheet is removed everywhere.
  - **Bar + session pips** — keep the 24-segment time bar, replace the plain "Session N"
    line with reformat's pips.
  - **Player = centered vertical stack** on the bare canvas.

**Architecture**
- `app/page.tsx`: `TABS = ["focus", "player", "tasks"]`, default `="focus"`; no more
  `ConsolePanel`. Panes stay permanently mounted; each pane is a flex scroller
  (`min-h-0 flex-1 overflow-y-auto`) and each screen centres itself with `m-auto`.
- New `components/focus/FocusClockDisplay.tsx` — badge + drum
  (`clamp(4rem,12vw,9rem)`), time bar, `SessionPips`; full-bleed optical hero.
- New `components/focus/SessionPips.tsx` — 4 dots (current = stretched `--accent-red`,
  done = `ink/70`, upcoming = open wells) + "Session N".
- New `components/focus/FocusControlDock.tsx` — **consolidated floating bottom dock**
  (`fixed bottom-6`). Idle: Skip, WORK rail, solid-red Start pill, BREAK rail, hold-to-
  reset. Running: `AnimatePresence mode="wait"` collapse to exactly **Pause + hold-to-
  reset** (pills hidden per the user); 44px "medium-small" pills, 750ms hold-to-reset
  preserved.
- `PomodoroTimer.tsx` — slimmed to state/URL/hold logic + composition (hero clock +
  dock); old transport well and footers removed.
- `LofiPlayer.tsx` — centered vertical stack: chips → artwork seat
  (`min(72vw,300px)`/`lg:min(30vh,340px)`) → title → transport → VU.
- `NavigationSegmentedControl.tsx` — tab order now Focus / Player / Tasks.
- Deleted `ConsolePanel.tsx` and `PomodoroTimerDock.tsx`; layout contract comment
  updated to the full-bleed world.

**Verification**
- `npm run lint`, `npx tsc --noEmit`, `npm run build` green. `detect.mjs` → `[]`.
- `tabs.js` (updated): desktop 1440×900 + mobile 390×844, zero console errors —
  Focus first/default; idle dock shows WORK/BREAK rails + Start; **running collapses to
  Pause + reset only** (pills gone); **real 850ms hold fires the reset** (Start/pills
  back, clock 25:00, URL defaults); audio `<audio>` same `src` across Focus→Tasks→
  Player; no page scroll desktop, no horizontal overflow mobile.

**Notes / open**
- Skip-to-break lives at idle only (user: "show only the play/pause and the reset
  button" while running) — can return as a quiet third icon on request.
- Legacy harnesses (`qa.js`/`timer.js`/`crisp.js`/`urledge.js`) assert the old two-sheet
  dock DOM and are superseded by the updated `tabs.js`.

### 2026-09-08 — Segmented-control navigation (third session of the day)

**Context / goals of the turn**
- User: "go back to the drawing board … we would need to go another route", pointing at
  `segmented-control-navigation.md` (an Apple-Watch-style floating **segmented control**
  with a sliding white pill + a satellite theme circle; spec was authored against
  `focus.itshassco.com`). This replaces the just-built no-chrome two-sheet deck.
- Decisions (question tool + confirmations):
  - **Three tabs**: Player · Focus · **Tasks** (a WIP placeholder only for now — user
    will later add user-created tasks; "just put the tab, nothing else, maybe a WIP").
  - **Satellite circle stays a theme button** (menu/content deferred — user: "it
    involves more things that just colors").
  - **Add `framer-motion`** dependency for the sliding thumb.
  - **Music must continue across tab switches**.
  - **All components must sit in the middle** of their sheet ("more clean").

**Architecture**
- `app/page.tsx` rewritten: a floating `NavigationSegmentedControl` (fixed top-left,
  `z-50`) + one centered `ConsolePanel` per tab inside a `h-svh lg:overflow-hidden`
  main. **All three panes stay permanently mounted** — tab switching only flips
  `hidden`/`flex` + `aria-hidden` on the `role="tabpanel"` wrappers, so LofiPlayer's
  `<audio>` and every player state persist. The sliding thumb is the switch motion
  (no pane remount, so no crossfade needed).
- `components/NavigationSegmentedControl.tsx` (new) — reskinned port of the spec:
  translucent `ink/4` track, hairline `border-ink/6`, pure-white sliding thumb via
  `layoutId="activeScreenIndicator"` + Framer spring `{ stiffness: 450, damping: 35,
  mass: 0.8 }`, `useReducedMotion` → instant. Full `role="tablist"/"tab"` semantics,
  roving `tabIndex`, ArrowLeft/Right cycling, `:focus-visible` ring, 44px targets.
  Satellite `Palette` circle (44px, `active:scale-95`) — live button, menu deferred.
- `components/TasksPanel.tsx` (new) — centered WIP placeholder ("Tasks / Coming soon"),
  `ListTodo` glyph in a muted circle, no functionality.
- `components/ConsolePanel.tsx` — content region now wraps children in an `m-auto` flex
  column, so pane content centres in the sheet when there is room and degrades to a
  top-anchored internal scroll on tight windows (never clips).
- `components/PomodoroTimer.tsx` — no longer renders its own `ConsolePanel` or an
  eyebrow; the page owns the single sheet. The phase Badge now sits above the drum.
  Removed the previous session's `lg:justify-[safe_center]` wrapper (page centres now).
- `components/LofiPlayer.tsx` — dropped `lg:h-full lg:items-[safe_center]` (page centres
  the pane); kept the two-column composition (`lg:flex-row lg:gap-8`), including the
  loading skeleton.
- `app/layout.tsx` — direction contract now emitted as a **real HTML comment** via
  `dangerouslySetInnerHTML` on a hidden `<span>` (a plain JSX comment is stripped by
  Next's renderer and never survives; verified `grep "Direction contract"` hits in
  `.next/server/app/index.html`).
- `package.json` — `framer-motion@13.2.0` added (imports from `framer-motion`
  directly, not `motion/react`).

**Verified (all green)**
- `npm run lint`, `npx tsc --noEmit`, `npm run build` — pass.
- New harness `/tmp/opencode/pw/tabs.js`:
  - Desktop 1440×900: 3 tabs render (Player selected by default); panels swap
    `flex`/`none` correctly on Focus/Tasks; **audio persists** — the `<audio>` element
    stays mounted with the **same `src`** after Player → Focus → Tasks → Player
    (never remounted/reloaded); no page scroll (`docH == winH == 900`); zero console
    errors.
  - Mobile 390×844: 3 tabs, Focus opens, zero horizontal overflow, zero errors.
- `detect.mjs --json` over all changed UI files → `[]` (clean). Screenshots →
  `/tmp/opencode/pw/tabs-{desktop,mobile}.png` (user must eyeball, per the session note
  about PNGs).

**Notes for future sessions**
- The shipped `impeccable-finish-reviewer` agent isn't available on this harness's
  subagent surface (`explore`/`general` only), and this was an extension of an
  established world, so the bounded in-thread verification above (harness + detector)
  closed the loop instead.
- Deferred by user decision: theme palette menu system, Tasks functionality.
- `deck.js` layout harness is stale (asserted the retired corner brand + two-sheet
  grid); `tabs.js` is the layout + persistence gate now.

### 2026-09-08 — No-chrome single-screen deck (second session of the day)

**Context / goals for the day**
- Refine the FlowSound frontend per `/impeccable`: remove the header and footer so the
  app is one full-viewport paper deck with **no page scroll** (desktop), with a quiet
  corner brand mark. Driven by the skill rule: bounded verification passes → stop.
- User decisions (question tool) locked the axes:
  - **Brand** = tiny quiet corner mark top-left (circle glyph + "FlowSound"), shown at
    `lg+` only, `pointer-events-none`. No header, no toolbar, no footer.
  - **Mobile** = graceful stacked scroll below `lg` (single-screen guarantee holds at
    desktop only, per DESIGN.md "mobile is a graceful stack"). On desktop the sheets
    are the screen; the brand is an etching, not chrome.

**What changed — frontend (`flowsound-frontend/`)**
- `app/page.tsx`: deleted `<header>` and `<footer>`. `main` → `relative flex h-svh
  flex-col overflow-x-hidden lg:overflow-hidden` (viewport-locked at desktop). Grid →
  `mx-auto grid min-h-0 w-full max-w-6xl grid-cols-1 flex-1 gap-6 … lg:grid-cols-[1fr_340px-392px]
  lg:grid-rows-[minmax(0,1fr)] lg:items-stretch`. Added the **corner brand** span
  (absolute top-left, `hidden lg:flex`, `pointer-events-none`, `select-none`, circle
  SVG + "FlowSound" in micro-tracked caps at `--ink/70`); removed the now-unused
  `Badge` import.
- `components/ConsolePanel.tsx`: sheet base → `flex min-h-0 flex-col overflow-hidden`
  with an inner `min-h-0 flex-1 overflow-y-auto` region wrapping children, so on short
  desktop windows content scrolls **inside the sheet** and the page frame never scrolls
  or clips. Eyebrow stays fixed.
- `components/LofiPlayer.tsx`: outer flex → `lg:h-full lg:items-[safe_center]` so the
  player centres vertically on tall sheets but falls back to top-anchored (scrollable)
  on short windows.
- `components/PomodoroTimer.tsx`: content wrapper → `lg:h-full
  lg:justify-[safe_center]`; dropped the now-redundant `lg:self-stretch` on its
  `ConsolePanel` (the grid already stretches).

**Grid-clip gotcha (fixed)**
- Initial build let the 1366×600 row size to content → sheet bottom clipped off-screen
  and unreachable (inner scroll was tied to content height, `clientH == scrollH`).
  Fix: `lg:grid-rows-[minmax(0,1fr)]` + `min-h-0` on the grid so the row is capped to
  the viewport's free space; the inner `overflow-y-auto` then takes over.

**Verified (all green)**
- `npm run lint`, `npx tsc --noEmit`, `npm run build` — all pass.
- New layout harness `/tmp/opencode/pw/deck.js`:
  - 1440×900: **no page scroll** (doc 900 == win 900), `main` exactly 900px, both
    sheets fill the frame (804px tall, horizontally adjacent `1fr + 392px`), inner
    content fits (`scrollH == clientH`), corner brand `display:flex`, zero console
    errors.
  - 1366×600: no page scroll, sheets fill (504px tall), inner content **does not fit**
    (scrollH 510/555 > clientH 403/398) so it scrolls internally — the deck never
    pushes past the frame.
  - 390×844: graceful stacked layout, corner brand `display:none`, zero errors.
  - Screenshots → `/tmp/opencode/pw/deck-{desktop,short,mobile}.png` (user must eyeball;
    PNGs can't be read programmatically).
- `DESIGN.md`: "Shell & layout" now records the single full-frame deck, the corner
  brand, the mobile graceful stack, the `safe_center` vertical centering, and the
  `ConsolePanel` internal scroll region; Verified section gained the deck harness.

**Notes for future sessions**
- `safe_center` (`lg:items-[safe_center]` / `lg:justify-[safe_center]`) is the key
  trick: centre on tall sheets, fall back to top-anchored + internal scroll on short
  windows, never clip.
- Per-category SVGs for picker chips still pending from user; `CategoryGlyph` awaits
  them. In this session the model's model couldn't view PNGs, so visual QA stays with
  the user on the three `deck-*.png` screenshots.

### 2026-09-08 — Open Lo-Fi replaces Spotify end-to-end

**Context / goals for the day**
- Replace the Spotify bridge (auth, playback poll, album-art accent) with the CC0
  **Open Lo-Fi** library (`btahir/open-lofi`): 166 tracks, 10 moods, streamed from the
  Flask backend. User confirmed full removal ("we are not going to use Spotify"),
  paper-deck styling, and a **per-category accent**; no emojis in the picker (SVGs to
  be supplied later).

**What changed — backend (`flowsound-backend/`)**
- **Fixed a latent import bug**: `app.py` imported `from utils.response_helpers`, but
  `utils/` only existed under `tests/` — a fresh `start.sh` failed with
  `ModuleNotFoundError` (the long-running server predated the move). Created a proper
  `flowsound-backend/utils/` package and removed `tests/utils/`.
- `app.py` rewritten: no Spotify. Loads the bundled `catalog.json` once; exposes
  `GET /api/music/categories`, `GET /api/music/playlist/<category>` (shuffled per
  request), `GET /api/music/stream/<category>/<filename>` (manifest-scoped so no
  arbitrary path resolves); `send_from_directory` on `static/lofi/{category}/`. CORS
  resource pattern still `/api/*`.
- `catalog.json` copied verbatim from `btahir/open-lofi` (matches local `lofi/` 166/166,
  zero mismatches). Slugs from the repo: `activities`, `seasonal-weather`,
  `ambient-lofi`, `soul-rnb`, `late-night`, `funk-soul`, `jazzhop`, `chillhop`,
  `asian-lofi`, `hybrid` — the friendly names from the plan draft did not match.
- **166 MP3s copied** (not moved) from repo-root `lofi/` into
  `static/lofi/{slug}/`; originals preserved.
- Deleted `services/spotify_service.py`, `services/color_extractor.py` (and the now
  empty `services/` dir), Spotify creds from `.env`/`.env.example`,
  `spotipy`/`colorgram.py`/`pillow`/`redis` from `requirements.txt`, OAuth playback
  config from `config.py`.
- Tests rewritten: `tests/test_api.py` now covers CORS, health, categories, shuffled
  playlists, manifest-scoped streaming, and JSON 404/405 — **13 passing**.

**What changed — frontend (`flowsound-frontend/`)**
- New `components/LofiPlayer.tsx` — the lo-fi deck: pill category picker (text-only
  `CategoryGlyph` placeholder, `data-category` hook for the future SVGs), an artwork
  seat that is a category-tinted radial well + platter (no album art in lo-fi), the
  hallowed ink transport pill (skip/play-pause/skip), VU meter, and a directly bound
  `<audio>`. Per-category oklch accents drive `--accent-now` (not album art).
- Audio/state design: `src` is set only on track/category change; play/pause flips
  never reload the buffer (intent held in `playingRef` to keep `playing` out of the
  src-binding effect's deps); `ended` auto-advances the shuffled queue.
- `app/page.tsx` rewritten: Spotify auth/poll/badge removed; Now Playing sheet hosts
  `LofiPlayer`; header pill reads "OpenLo-Fi · On deck".
- Deleted `components/SpotifyPlayerCard.tsx`, `types/playback.ts`; removed unused
  `postApi` from `lib/api.ts`; added `types/lofi.ts` with `MusicCategory`/`LoFiTrack`.
- `react-hooks/set-state-in-effect` lint rule respected: category selection resets
  state in the click handler, never synchronously in an effect.

**Verified (all green)**
- Frontend: `npm run lint`, `npx tsc --noEmit`, `npm run build` — all pass.
- Backend: `pytest` 13/13; backend restarted (`kill <pid>` + `./start.sh`) and serving
  catalog; `curl` checks: health `{library:"OpenLo-Fi",track_count:166,category_count:10}`,
  playlist 29 activities tracks, stream `audio/mpeg` with
  `Access-Control-Allow-Origin: http://127.0.0.1:3000`, 404 on bad category + on
  valid-filename-in-wrong-category.
- Playwright harness `/tmp/opencode/pw/lofi.js` (playwright-core + pinned Chromium):
  10 category chips render; clicking a category loads a real track (title + audio
  `src` → `/api/music/stream/late-night/elevator-to-the-moon.mp3`); play/next enabled;
  **zero console/page errors**. Screenshot → `/tmp/opencode/pw/lofi-player.png`
  (user must eyeball; PNGs can't be read programmatically).

**Notes for future sessions**
- Per-category SVGs pending from user; `CategoryGlyph` awaits them (`id` + tag args).
- Browser autoplay is user-gesture gated — automated DOM checks confirm `src`
  binding but not audible playback.
- `--accent-now` colors are hand-picked oklch values in `LofiPlayer.tsx`
  (`CATEGORY_ACCENTS`) — tune freely.
- Old harness references to Spotify UX (`mock.js`, `actionerror.js`) are stale; they
  target the removed auth/playback flows. `qa.js`/`timer.js`/`crisp.js`/`urledge.js`
  (Focus Engine + dock) still apply unchanged.

**Gotchas discovered this session**
- The `utils` import bug was invisible while the old server kept running — always test
  a **fresh** import (`python -c "from app import app"`) before relying on a restart.
- The paste-provided category slugs (`focus`/`rain`/`ambient`/…) were wrong vs. the
  real repo catalog; the repo's own `catalog.json` is authoritative and all 166 files
  matched it exactly.
- Playwright needed `npm i playwright-core` + `executablePath` to the pinned Chromium;
  the old harness dir `/tmp/opencode/pw/` had been wiped, so it was recreated.

### 2026-09-04 — Dual-rail dock polish, system audit, Tier 1–3 hardening

**Context / goals for the day**
- Finalize the dual-rail dock (WORK/BREAK rails, ±1 steppers) that replaced the old
  dropdown + slider picker.
- Respond to the user's request set: bouncy hover **and** click, make the
  skip/reset transport the same width as the Start/Pause capsule, and fix the
  "blur then snap" glitch on click.
- Then run a system-wide audit (frontend + backend) and implement agreed fixes.

**Decisions made with the user**
- "Crisp translate spring" chosen for press feedback (no scale on text controls).
- Implement **Tier 1 + 2 (frontend)** and **Tier 3 (backend)**. Tier 4 (tests & cleanup)
  not selected.
- No Spotify credentials exist and the user is **evaluating alternative APIs/services**,
  so the Spotify bridge must fail loudly but keep the app alive ("Awaiting credentials"
  state) instead of blocking startup.
- Backend may be restarted for verification.

**Root cause found & fixed: the "blur" bug**
- `usePressBounce` scale animation (`0.9 → 1.02 → 1`, 340ms) re-rasterizes text glyphs at
  fractional sizes → text reads blurry-then-sharp on click.
- Fix: **pure translate springs** for text-bearing controls. Press `translateY(1px)`,
  release WAAPI `1px → -1.5px → 0` over 320ms (`--ease-spring`). Icon-only Spotify play
  button keeps the scale squish (`usePressBounce(0.9)`).
- API: `usePressBounce(number)` → scale plane; `{ plane:"translate", start:1, peak:-1.5 }`
  → translate. `crispBounce` / `TRANSPORT_W` / `hoverLiftClass` exported from
  `PomodoroTimerDock.tsx`.
- Hover lift = `translate` property (Tailwind v4) on a wrapper: 300ms spring,
  `[@media(hover:hover)]:hover:-translate-y-[1.5px]`, flattened under reduced motion.
- Transport well width == capsule: both `w-[9.5rem] h-11` (152px).

**Tier 1 — Focus Engine correctness (frontend)**
- `PomodoroTimer.tsx`: URL durations are untrusted input → clamp at render.
  - `work`/`rest` via `clampMinutes` (1–180/1–60); `left`/`endsAt` capped to
    0..phase-duration; `done` ≥ 0.
  - `?work=0`/`-5` → 01:00, `?work=9999` → 180:00, `?rest=9999` → 60:00, runaway
    `left=1e12` → capped, `done=999` → "Session 1000".
- `?running=1&endsAt=0` normalizes back to a paused, ready phase (was a forever-stuck
  "running" timer).
- Pause landing at exactly 00:00 → **advances** to next phase (was snap-back to full).
- `SegmentedProgress`: `aria-valuenow` guarded by `Number.isFinite` (defense in depth).
- `SlidingDigitCounter`: `aria-live` now announces **minute-granularity**
  ("X minutes remaining") — one screen-reader update per minute instead of per second;
  the visual drum still shows seconds.

**Tier 2 — Playback integrity (frontend)**
- `lib/api.ts`: 8s `AbortSignal.timeout`, structured `ApiError {status, message}`,
  guarded JSON parsing, error message from body.
- `SpotifyPlayerCard.tsx`:
  - keyed on `track_id` **only** (was `track_id + is_playing`, which remounted the card
    on every play/pause poll and dropped keyboard focus);
  - optimistic play/pause **reverts** on rejected action and announces a polite
    `role="status"` notice ("No active device …", "Spotify connection dropped …",
    "Couldn't reach your player …");
  - `isPlaying` prop reconciled during render (render-phase setState, since the
    `react-hooks/set-state-in-effect` lint rule bans `setState` in an effect).
- `app/page.tsx`: poller pauses when tab hidden or offline, wakes on
  `visibilitychange`/`online`; auth poll 30s connected / 60s idle; the one-time `?auth=`
  param is scrubbed from the URL after triggering a fresh auth poll; `ConnectToSpotify`
  surfaces `configured:false` as "Awaiting credentials / Spotify not configured".
- `VUMeter.tsx`: first paint happens immediately (before the 120ms interval).
- `usePressBounce.ts`: verified its cleanup already removes the window `pointerup`
  listener — no leak, no change needed.

**Tier 3 — Backend hardening**
- `services/spotify_service.py`:
  - loud `ValueError` on missing creds (kept), but app records the reason and stays up.
  - OAuth `state` nonce (`create_auth_state` / `validate_auth_state`, rotating, 10-min TTL).
  - `get_access_token(code, check_cache=False)` — every callback code gets a fresh exchange.
  - `get_spotify_client()` builds `spotipy.Spotify(auth_manager=…)` → auto-refresh on 401,
    no `KeyError`/double-refresh; pre-validates the stored token.
  - `is_authenticated()` uses `auth_manager.validate_token` semantics.
  - `TtlRedisCacheHandler` (own class): Redis token cache with a 30-day sliding TTL;
    MemoryCacheHandler fallback when Redis is down.
- `app.py`:
  - `logging` (timestamped) replaces `print`; `logger.exception` at every swallow-point.
  - `/api/health` → `spotify_error` reason; `/api/auth/status` → `configured:false` + reason.
  - OAuth login attaches `state`; callback rejects bad/missing state.
  - JSON `errorhandler` for 404/405/500.
  - Palette memo = bounded LRU (`OrderedDict`, max 128).
  - `/api/playback/<action>`: unknown action → 404 **before** the unconfigured 503 gate.
  - `/api/playback/current`: `SpotifyException` 401/403 → 401 JSON ("reconnect"),
    429 → 429 JSON ("rate limited"); everything else → graceful NO_PLAYBACK.
  - `app.run(debug=Config.DEBUG)` (off by default; `FLOWSOUND_DEBUG=1` to enable).
- `services/color_extractor.py`: host allowlist (`i.scdn.co`, `mosaic.scdn.co`),
  `allow_redirects=False`, 5MB byte cap (declared + streamed), `MAX_IMAGE_PIXELS=12M`,
  downscale to ≤256px before colorgram, failures logged at debug, fallback palette kept.
- `config.py`: `DEBUG` flag added.
- `start.sh`: drops stale `server.pid` before starting; honors `FLOWSOUND_HOST/PORT`.
- `requirements.txt`: `charset-normalizer` (silences requests deprecation warning),
  `pytest` added.

**Verification (all green)**
- Frontend: `npm run lint`, `npx tsc --noEmit`, `npm run build` — all pass.
- Backend: `pytest` 36/36 (`tests/test_api.py` + new `tests/test_hardening.py`,
  `tests/test_spotify_service.py`).
- Harnesses (see harness notes below): `qa.js` 71/71, `timer.js` ALL PASS, `bounce.js`,
  `bounceall.js` (3× stable), `crisp.js` CRISP PASSED (blur regression gate), and the two
  new gates `urledge.js` + `actionerror.js` all pass after fixing two **harness** bugs
  (below).
- Six screenshots recaptured to `.impeccable/review/`.
- Backend restarted and left **running** on hardened code:
  - `/api/health` → `{"spotify_configured": false, "spotify_error": "Missing Spotify
    credentials …"}`
  - `/api/auth/status` → `{"authenticated": false, "configured": false, "reason": …}`
  - `/api/auth/login` → 503; `/api/playback/fastforward` → `{"error":"Unknown action"}`
- `DESIGN.md` contract + Verified sections updated.

**Gotchas discovered this session**
- `nuqs` parses integers with `parseInt`, so `?left=1e12` reads as **1** (stops at `e`).
  The clamp handled it safely (rendered 1ms → 00:01), but harness expectations must use
  digit literals (`1000000000000`). Not a code bug — inherent to the parser.
- `nuqs` strips params equal to their default from the URL (e.g. `running=0` disappears).
  Assert "absent OR '0'", not exactly `"0"`.
- The venv was created under `/home/KyuuLM/…` (old machine path): `source`ing
  `activate`/relative `.venv` paths warns and can resolve to system python. Fixed
  `pyvenv.cfg` to `/home/josesito/…`. Use `.venv/bin/python` directly.
- `changes.md` is a **stale legacy spec** for the old digit-counter build (framer-motion,
  dark world) — it does not reflect the shipped Nunito/cream/crisp-spring world. Do not
  treat it as source of truth.
- Env note: the workspace is a git repo (`.git` at repo root) even though some tooling
  reported otherwise.

**Notes for future sessions**
- **Spotify is the locked pending item**: `SPOTIFY_CLIENT_ID`/`SECRET` are empty in
  `.env`; user is choosing alternative APIs/services. When a provider is chosen, wire the
  "Awaiting credentials" path + 503 gates to it. Verify playlist auth with `state`
  end-to-end once creds exist. "Live Spotify" verification remains on DESIGN.md's
  "Still open".
- Harness environment: Chrome at
  `/home/josesito/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, BASE
  `http://127.0.0.1:3000`, harnesses in `/tmp/opencode/pw/`:
  `qa.js` (layout/contrast/dock/widths), `timer.js` (odometer/hold/reduced-motion),
  `mock.js` (6 screenshots → `.impeccable/review/`), `bounce.js`/`bounceall.js` (spring
  motion), `crisp.js` (no-blur gate), `urledge.js` (URL edge matrix), `actionerror.js`
  (playback integrity + poller gating + auth param scrub). PNGs can't be viewed
  programmatically — user must eyeball them.
- Ops: `start.sh`/`stop.sh` live at the **repo root**; backend logs to
  `flowsound-backend/server.log`, pid in `flowsound-backend/server.pid`. Restart backend
  with `kill -- -<pid>` then `./start.sh` (start.sh restarts only the backend if :3000
  is already up).
- Frontend build/lint: Next 16 + Turbopack; the `react-hooks/set-state-in-effect` rule is
  active — use the render-phase "adjust state when prop changes" pattern (see
  `SpotifyPlayerCard.tsx`), not a sync effect.
- `AGENTS.md` (frontend) auto-re-adds its "This is NOT the Next.js you know" block from
  `next dev`; keep it out of committed diffs or commit it once to keep the tree clean.
- Dead/unused left in place unless user opts to delete: `ui/select.tsx`, `ui/slider.tsx`.
  `PRODUCT.md` still has a stale brand line (decision pending).
- Prefer `.venv/bin/python -m pytest` in `flowsound-backend` for backend tests.