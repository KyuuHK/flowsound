import os

import redis
import spotipy
from spotipy.cache_handler import MemoryCacheHandler, RedisCacheHandler
from spotipy.oauth2 import SpotifyOAuth


class SpotifyAuraManager:
    """Spotify API client wrapper with Redis-backed token caching.

    Credentials are read from the environment (see .env.example). A Redis
    connection is attempted for the auth token cache and gracefully falls
    back to an in-memory cache when Redis is unreachable.
    """

    SCOPE = (
        "user-read-playback-state "
        "user-modify-playback-state "
        "user-read-currently-playing"
    )

    REDIS_HOST = "127.0.0.1"
    REDIS_PORT = 6379
    REDIS_TOKEN_KEY = "flowsound:spotify_token"

    def __init__(self):
        self.client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        self.client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = os.environ.get(
            "SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8888/callback"
        )

        if not self.client_id or not self.client_secret:
            raise ValueError(
                "Missing Spotify credentials. Create a .env file with "
                "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (see .env.example)."
            )

        self.redis_client = None
        self.spotify_client = None
        self.connect_to_spotify()

    def _build_cache_handler(self):
        try:
            redis_client = redis.Redis(
                host=self.REDIS_HOST,
                port=self.REDIS_PORT,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
            redis_client.ping()
            self.redis_client = redis_client
            return RedisCacheHandler(redis_client, key=self.REDIS_TOKEN_KEY)
        except Exception as exception:
            print(f"Redis unavailable ({exception}); using in-memory token cache.")
            return MemoryCacheHandler()

    def connect_to_spotify(self):
        auth_manager = SpotifyOAuth(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=self.redirect_uri,
            scope=self.SCOPE,
            cache_handler=self._build_cache_handler(),
            open_browser=True,
        )
        self.spotify_client = spotipy.Spotify(auth_manager=auth_manager)

    def get_current_playback_info(self):
        try:
            playback_state = self.spotify_client.current_playback()
        except Exception as exception:
            print(f"Error retrieving playback info: {exception}")
            return None

        if not playback_state or not playback_state.get("item"):
            return None

        item = playback_state["item"]
        album_images = item.get("album", {}).get("images", []) or []
        return {
            "track_id": item.get("id"),
            "track_name": item.get("name"),
            "artist_name": item["artists"][0]["name"]
            if item.get("artists") else "Unknown Artist",
            "album_art_url": album_images[0]["url"] if album_images else None,
            "progress_ms": playback_state.get("progress_ms"),
            "duration_ms": item.get("duration_ms"),
            "is_playing": playback_state.get("is_playing", False),
        }

    # Backwards-compatible alias for the earlier typo'd name.
    get_current_playback_into = get_current_playback_info

    def is_playing(self):
        info = self.get_current_playback_info()
        return bool(info and info["is_playing"])

    def _safe_call(self, operation, *args):
        try:
            getattr(self.spotify_client, operation)(*args)
            return True
        except Exception as exception:
            print(f"Error during {operation}: {exception}")
            return False

    def toggle_playback(self):
        if self.is_playing():
            return self._safe_call("pause_playback")
        return self._safe_call("start_playback")

    def play(self):
        return self._safe_call("start_playback")

    def pause(self):
        return self._safe_call("pause_playback")

    def next_track(self):
        return self._safe_call("next_track")

    def previous_track(self):
        return self._safe_call("previous_track")
