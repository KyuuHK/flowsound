import json
import logging
import random
import os

from flask import Flask, request, send_from_directory
from flask_cors import CORS

from config import Config
from utils.response_helpers import error, ok

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("flowsound")

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": Config.cors_origins()}},
    supports_credentials=True,
)

# ─── Open Lo-Fi catalog (bundled at the backend root) ──────────────────────
_CATALOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "catalog.json")
with open(_CATALOG_PATH) as _f:
    _CATALOG = json.load(_f)

_CATEGORIES = {c["slug"]: c for c in _CATALOG["categories"]}
_TRACKS_BY_CATEGORY: dict[str, list] = {}
for _t in _CATALOG["tracks"]:
    _TRACKS_BY_CATEGORY.setdefault(_t["category"], []).append(_t)


# --- health ----------------------------------------------------------------


@app.get("/api/health")
def handle_health():
    return ok(
        {
            "ok": True,
            "library": _CATALOG["name"],
            "track_count": _CATALOG["trackCount"],
            "category_count": len(_CATALOG["categories"]),
        }
    )


# --- lo-fi music -----------------------------------------------------------


@app.get("/api/music/categories")
def get_categories():
    """Return categories (id/slug, label, count) for the UI picker."""
    return ok(
        [
            {
                "id": c["slug"],
                "name": c["label"],
                "count": c.get("trackCount", len(_TRACKS_BY_CATEGORY.get(c["slug"], []))),
            }
            for c in _CATALOG["categories"]
        ]
    )


@app.get("/api/music/playlist/<category>")
def get_playlist(category):
    """Return shuffled tracks (metadata only) for a category."""
    if category not in _CATEGORIES:
        return error(f"Unknown category: {category}", 404)
    tracks = [dict(t) for t in _TRACKS_BY_CATEGORY.get(category, [])]
    random.shuffle(tracks)
    return ok(tracks)


@app.get("/api/music/stream/<category>/<path:filename>")
def stream_track(category, filename):
    """Serve the actual MP3 file from static/lofi/<category>/."""
    if category not in _CATEGORIES:
        return error(f"Unknown category: {category}", 404)
    # Resolve the filename through the catalog so we never serve an arbitrary
    # file: only names that exist in a category's manifest are served.
    manifest_names = {t["filename"] for t in _TRACKS_BY_CATEGORY.get(category, [])}
    if filename not in manifest_names:
        return error("Track not found", 404)
    response = send_from_directory(f"static/lofi/{category}", filename)
    # Filenames are content-addressed by the catalog manifest, so a track is
    # immutable on the network: cache it hard and skip revalidation. Chromium
    # still issues the Range requests it wants; 206 handling is Werkzeug's.
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


# --- JSON error handlers ----------------------------------------------------


@app.errorhandler(404)
def handle_not_found(_error):
    logging.getLogger("flowsound").warning("404 on %s", request.path)
    return error("Not found", 404)


@app.errorhandler(405)
def handle_method_not_allowed(_error):
    return error("Method not allowed", 405)


@app.errorhandler(500)
def handle_server_error(_error):
    logging.getLogger("flowsound").exception("Unhandled server error")
    return error("Internal server error", 500)


if __name__ == "__main__":
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
