import asyncio

POLL_INTERVAL_SECONDS = 3.0
LAST_TRACK_KEY = "flowsound:last_track"


class SpotifyEngine:
    """Polls Spotify for playback state and fires change callbacks.

    Runs as a coroutine (driven by flet's ``page.run_task``) so callbacks
    execute on the UI thread. Emits ``on_track_change`` when a different
    track is detected and ``on_play_state_change`` when playing/paused
    flips. The last seen track id is mirrored to Redis when available.
    """

    def __init__(self, manager, redis_client=None):
        self.manager = manager
        self.redis = redis_client
        self.current_track_id = None
        self.current_is_playing = None
        self.last_info = None
        self.on_track_change = None
        self.on_play_state_change = None
        self.on_error = None
        self._stopped = False

    def stop(self):
        self._stopped = True

    async def poll_loop(self):
        while not self._stopped:
            try:
                self._poll_once()
            except Exception as exception:
                if self.on_error:
                    self.on_error(exception)
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    def _poll_once(self):
        info = self.manager.get_current_playback_info()
        track_id = info["track_id"] if info else None
        is_playing = bool(info and info["is_playing"])

        if self._track_changed(track_id):
            self.last_info = info
            if self.on_track_change:
                self.on_track_change(info)

        if is_playing != self.current_is_playing:
            self.current_is_playing = is_playing
            if self.on_play_state_change:
                self.on_play_state_change(is_playing)

    def _track_changed(self, track_id):
        if track_id == self.current_track_id:
            return False
        self.current_track_id = track_id
        if self.redis:
            try:
                self.redis.set(LAST_TRACK_KEY, track_id or "")
            except Exception:
                pass
        return True
