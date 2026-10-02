const $ = (id) => document.getElementById(id);

const els = {
  albumArt: $("album-art"),
  trackTitle: $("track-title"),
  artistName: $("artist-name"),
  phaseLabel: $("phase-label"),
  timerDisplay: $("timer-display"),
  sessionLabel: $("session-label"),
  prev: $("btn-prev"),
  play: $("btn-play"),
  next: $("btn-next"),
  timerToggle: $("btn-timer-toggle"),
  timerSkip: $("btn-timer-skip"),
  timerReset: $("btn-timer-reset"),
  iconPlay: $("icon-play"),
  iconPause: $("icon-pause"),
  iconTimerPlay: $("icon-timer-play"),
  iconTimerPause: $("icon-timer-pause"),
};

let ws = null;

// --- rendering ----------------------------------------------------------

function showHide(showEl, hideEl, show) {
  showEl.hidden = !show;
  hideEl.hidden = show;
}

function applyTrack(info) {
  if (!info) {
    els.trackTitle.textContent = "Nothing playing";
    els.artistName.textContent = "Start something on Spotify";
    els.albumArt.removeAttribute("src");
    return;
  }
  els.trackTitle.textContent = info.track_name || "Unknown track";
  els.artistName.textContent = info.artist_name || "Unknown artist";
  if (info.album_art_url) {
    els.albumArt.src = info.album_art_url;
  } else {
    els.albumArt.removeAttribute("src");
  }
}

function applyPlayState(isPlaying) {
  showHide(els.iconPause, els.iconPlay, isPlaying);
}

function applyTimer(t) {
  els.timerDisplay.textContent = t.mmss;
  els.phaseLabel.textContent = t.phase_label;
  const base = t.completed_sessions;
  els.sessionLabel.textContent =
    t.phase === "work"
      ? `Session ${t.current_session}/${t.sessions_total}`
      : `${base} sessions done`;
  showHide(els.iconTimerPause, els.iconTimerPlay, t.running);
}

function applyDisconnected() {
  els.trackTitle.textContent = "Connect to Spotify";
  els.artistName.textContent =
    "Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env";
  els.albumArt.removeAttribute("src");
  els.prev.disabled = true;
  els.play.disabled = true;
  els.next.disabled = true;
}

function setPlaybackEnabled(enabled) {
  els.prev.disabled = !enabled;
  els.play.disabled = !enabled;
  els.next.disabled = !enabled;
}

function applyFullState(state) {
  if (!state.spotify_connected) {
    applyDisconnected();
  } else {
    setPlaybackEnabled(true);
    applyTrack(state.track);
    applyPlayState(Boolean(state.is_playing));
  }
  applyTimer(state.timer);
}

// --- websocket ----------------------------------------------------------

function handleMessage(event) {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case "state":
      applyFullState(msg.data);
      break;
    case "track":
      applyTrack(msg.data);
      break;
    case "play":
      applyPlayState(msg.data);
      break;
    case "timer":
      applyTimer(msg.data);
      break;
  }
}

function connect() {
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = handleMessage;
  ws.onerror = () => ws.close();
  ws.onclose = () => setTimeout(connect, 2000);
}

// --- actions ------------------------------------------------------------

async function post(path, body) {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return await res.json();
  } catch (err) {
    console.error(path, err);
    return { ok: false };
  }
}

async function playback(action) {
  await post(`/api/playback/${action}`);
}

function togglePlayback() {
  const isPlaying = !els.iconPause.hidden;
  showHide(els.iconPause, els.iconPlay, !isPlaying); // optimistic
  playback("toggle");
}

async function timerAction(action) {
  const res = await post(`/api/timer/${action}`);
  if (res.state) applyTimer(res.state);
}

function bind() {
  els.prev.addEventListener("click", () => playback("previous"));
  els.play.addEventListener("click", togglePlayback);
  els.next.addEventListener("click", () => playback("next"));
  els.timerToggle.addEventListener("click", () => timerAction("toggle"));
  els.timerSkip.addEventListener("click", () => timerAction("skip"));
  els.timerReset.addEventListener("click", () => timerAction("reset"));
}

// --- init ---------------------------------------------------------------

async function init() {
  bind();
  try {
    const state = await (await fetch("/api/state")).json();
    applyFullState(state);
  } catch (err) {
    console.error("initial state fetch failed", err);
  }
  connect();
}

init();
