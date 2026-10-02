import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from spotify_engine import SpotifyEngine
from spotify_manager import SpotifyAuraManager
from utils import PomodoroTimer, format_mmss, load_env

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

timer = PomodoroTimer()
manager = None
engine = None
connections: set[WebSocket] = set()

PLAYBACK_ACTIONS = {
    "play": "play",
    "pause": "pause",
    "toggle": "toggle_playback",
    "next": "next_track",
    "previous": "previous_track",
}
TIMER_ACTIONS = {
    "toggle": "toggle",
    "reset": "reset",
    "skip": "skip",
}


async def broadcast(payload: dict):
    for ws in list(connections):
        try:
            await ws.send_json(payload)
        except Exception:
            connections.discard(ws)


def _schedule_broadcast(payload: dict):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(broadcast(payload))


def on_track_change(info):
    _schedule_broadcast({"type": "track", "data": info})


def on_play_state_change(is_playing):
    _schedule_broadcast({"type": "play", "data": is_playing})


def timer_state() -> dict:
    return {
        "phase": timer.phase,
        "phase_label": timer.phase_label,
        "remaining": timer.remaining,
        "mmss": format_mmss(timer.remaining),
        "current_session": timer.current_session,
        "sessions_total": PomodoroTimer.SESSIONS_PER_CYCLE,
        "completed_sessions": timer.completed_sessions,
        "running": timer.running,
    }


def app_state() -> dict:
    return {
        "spotify_connected": manager is not None,
        "track": engine.last_info if engine else None,
        "is_playing": engine.current_is_playing if engine else False,
        "timer": timer_state(),
    }


async def timer_loop():
    while True:
        await asyncio.sleep(1)
        timer.tick()
        await broadcast({"type": "timer", "data": timer_state()})


async def poll_loop():
    if engine is None:
        return
    try:
        await engine.poll_loop()
    except asyncio.CancelledError:
        pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global manager, engine
    load_env()
    try:
        manager = SpotifyAuraManager()
    except ValueError as exc:
        print(exc)

    if manager is not None:
        engine = SpotifyEngine(manager, redis_client=manager.redis_client)
        engine.on_track_change = on_track_change
        engine.on_play_state_change = on_play_state_change

    tasks = [asyncio.create_task(timer_loop())]
    if engine is not None:
        tasks.append(asyncio.create_task(poll_loop()))
    yield
    if engine is not None:
        engine.stop()
    for task in tasks:
        task.cancel()


app = FastAPI(title="FlowSound", lifespan=lifespan)


@app.get("/")
async def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/api/state")
async def get_state():
    return app_state()


@app.post("/api/playback/{action}")
async def playback(action: str):
    if manager is None:
        return {"ok": False, "error": "Spotify not connected"}
    method_name = PLAYBACK_ACTIONS.get(action)
    if method_name is None:
        return {"ok": False, "error": f"Unknown action: {action}"}
    ok = getattr(manager, method_name)()
    return {"ok": ok}


@app.post("/api/timer/{action}")
async def timer_action(action: str):
    method_name = TIMER_ACTIONS.get(action)
    if method_name is None:
        return {"ok": False, "error": f"Unknown action: {action}"}
    getattr(timer, method_name)()
    await broadcast({"type": "timer", "data": timer_state()})
    return {"ok": True, "state": timer_state()}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connections.add(ws)
    try:
        await ws.send_json({"type": "state", "data": app_state()})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connections.discard(ws)


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
