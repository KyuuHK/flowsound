# FlowSound

## What it is
FlowSound is a desktop ambient-focus console on a warm chalk-cream paper deck. It streams the
bundled, public-domain **Open Lo-Fi** library (166 tracks across 10 moods), tints the player in the
active mood's accent, and runs a configurable Focus engine (Pomodoro with a Focus and a Break
phase) beside it. No account, no API credentials — the music ships with the app.

## Who uses it, where
One person working at a desk, wearing headphones, playing music while they work. The browser is a
full-screen companion — glanceable at distance, operable without reading glasses. Success reads as
*ambient hardware*: a lo-fi mood softly warming the paper deck, a focus timer counting down like an
instrument's meter.

## Mechanism
- Backend (`flowsound-backend`, Flask) — serves the Open Lo-Fi catalog: category listing,
  shuffled playlists, and MP3 streaming from `static/lofi/{category}/`. CORS-locked to the
  frontend origins.
- Frontend (`flowsound-frontend`, Next.js) — the lo-fi deck (category picker + in-browser
  `<audio>` transport + per-mood accent + VU meter) and the focus engine with nuqs URL-backed
  state.
- Legacy fastapi/Spotify prototype preserved in `flowsound-legacy/`.

## The good
- Tasks: picking a mood, starting music and reading the track (State 1), starting/pausing both
  timer and playback (State 2), adjusting durations (State 3).

## Brand commitment (pinned by the owner)
Rounded paper instrument deck: chalk-cream canvas, white hairline-framed sheets, Nunito in every
role, springs everywhere motion happens, an Apple-red double-dot marking the focus clock, and one
category accent (moss, rain-sky, ember, indigo, …) lighting the lo-fi side while playing.
Desktop-first; mobile is a graceful stack.