"""Lo-Fi library API regression tests.

Exercise the real Flask music endpoints through the test client: category
listing, per-category playlists, and MP3 streaming. CORS allowlisting and the
JSON error handlers are covered here too since they are the shared seams.
"""

import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app as app_module  # noqa: E402
from config import Config  # noqa: E402


@pytest.fixture()
def client():
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


# --- CORS allowlisting ------------------------------------------------------


def test_cors_answers_the_configured_frontend_origin(client):
    response = client.get(
        "/api/music/categories", headers={"Origin": "http://127.0.0.1:3000"}
    )
    assert (
        response.headers.get("Access-Control-Allow-Origin")
        == "http://127.0.0.1:3000"
    )


def test_cors_answers_the_localhost_alias(client):
    # next/webpack dev servers advertise http://localhost:3000; it must work too.
    response = client.get(
        "/api/music/categories", headers={"Origin": "http://localhost:3000"}
    )
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"


def test_cors_refuses_unknown_origins(client):
    response = client.get(
        "/api/music/categories", headers={"Origin": "http://evil.example"}
    )
    assert "Access-Control-Allow-Origin" not in response.headers


def test_cors_origins_include_frontend_url_and_extras(monkeypatch):
    monkeypatch.setattr(Config, "FRONTEND_URL", "https://app.example.com")
    monkeypatch.setenv("EXTRA_FRONTEND_ORIGINS", "https://mirror.example.com")
    origins = Config.cors_origins()
    assert "https://app.example.com" in origins
    assert "https://mirror.example.com" in origins


def test_cors_origins_alias_localhost_for_loopback_origins():
    origins = Config.cors_origins()
    assert "http://127.0.0.1:3000" in origins
    assert "http://localhost:3000" in origins


# --- health ----------------------------------------------------------------


def test_health_reports_library(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["track_count"] == app_module._CATALOG["trackCount"]
    assert payload["category_count"] == 10


# --- categories ------------------------------------------------------------


def test_categories_lists_all_with_counts(client):
    response = client.get("/api/music/categories")
    assert response.status_code == 200
    categories = response.get_json()
    assert len(categories) == 10
    by_id = {c["id"]: c for c in categories}
    assert by_id["activities"]["count"] == 29
    assert by_id["jazzhop"]["count"] == 12
    assert by_id["chillhop"]["name"] == "Chillhop & Cozy Beats"


# --- playlists -------------------------------------------------------------


def test_playlist_returns_expected_count(client):
    response = client.get("/api/music/playlist/activities")
    assert response.status_code == 200
    tracks = response.get_json()
    assert len(tracks) == 29
    for t in tracks:
        assert t["category"] == "activities"
        assert "title" in t
        assert "filename" in t


def test_playlist_is_shuffled(client):
    import random

    random.seed(1)
    first = [t["filename"] for t in client.get("/api/music/playlist/activities").get_json()]
    assert len(first) == 29
    # Two consecutive requests should (overwhelmingly) yield different orders.
    random.seed(None)
    second = [t["filename"] for t in client.get("/api/music/playlist/activities").get_json()]
    assert set(first) == set(second)
    # A 29! sample space makes a collision essentially impossible.
    assert first != second


def test_playlist_unknown_category_is_404(client):
    response = client.get("/api/music/playlist/nope")
    assert response.status_code == 404
    assert "error" in response.get_json()


# --- streaming -------------------------------------------------------------


def test_stream_serves_mpeg_for_known_track(client):
    response = client.get("/api/music/stream/activities/2-am-debug-loop.mp3")
    assert response.status_code == 200
    assert "audio/" in response.content_type


def test_stream_is_cacheable_immutable(client):
    response = client.get("/api/music/stream/activities/2-am-debug-loop.mp3")
    assert response.headers.get("Cache-Control") == "public, max-age=31536000, immutable"


def test_stream_answers_range_with_206(client):
    response = client.get(
        "/api/music/stream/activities/2-am-debug-loop.mp3", headers={"Range": "bytes=100-199"}
    )
    assert response.status_code == 206
    assert response.headers.get("Accept-Ranges") == "bytes"
    assert response.headers.get("Content-Range") == "bytes 100-199/2333286"
    assert len(response.data) == 100


def test_stream_out_of_range_is_416(client):
    response = client.get(
        "/api/music/stream/activities/2-am-debug-loop.mp3",
        headers={"Range": "bytes=9999999999-"},
    )
    assert response.status_code == 416
    assert response.headers.get("Content-Range") == "bytes */2333286"


def test_stream_if_range_match_keeps_206(client):
    etag = client.get("/api/music/stream/activities/2-am-debug-loop.mp3").headers.get("ETag")
    assert etag
    response = client.get(
        "/api/music/stream/activities/2-am-debug-loop.mp3",
        headers={"Range": "bytes=100-199", "If-Range": etag},
    )
    assert response.status_code == 206
    assert response.headers.get("Content-Range") == "bytes 100-199/2333286"


def test_stream_if_range_mismatch_returns_full_200(client):
    response = client.get(
        "/api/music/stream/activities/2-am-debug-loop.mp3",
        headers={"Range": "bytes=100-199", "If-Range": '"stale-etag"'},
    )
    assert response.status_code == 200
    assert response.headers.get("Content-Range") is None


def test_stream_rejects_filename_not_in_category(client):
    # 3-am-echoes.mp3 is in late-night, not activities.
    response = client.get("/api/music/stream/activities/3-am-echoes.mp3")
    assert response.status_code == 404


def test_stream_unknown_category_is_404(client):
    response = client.get("/api/music/stream/nope/x.mp3")
    assert response.status_code == 404
    assert "error" in response.get_json()


# --- JSON error handlers ---------------------------------------------------


def test_unknown_route_returns_json_404(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert "error" in response.get_json()


def test_wrong_method_returns_json_405(client):
    response = client.post("/api/music/categories")
    assert response.status_code == 405
    assert "error" in response.get_json()
