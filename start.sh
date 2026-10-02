#!/usr/bin/env bash
# Start the FlowSound backend (Flask :5000) + frontend (Next.js :3000).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$ROOT/.venv/bin/python"

HOST="${FLOWSOUND_HOST:-127.0.0.1}"
PORT="${FLOWSOUND_PORT:-5000}"

port_up() {
  curl -s -m 1 -o /dev/null "http://127.0.0.1:$1/" 2>/dev/null
}

if port_up "$PORT"; then
  echo "[flowsound] something already answers on :$PORT"
else
  # Port is free: drop the stale pid file so stop.sh can't touch an unrelated
  # pid the OS may have reused, then start the backend.
  rm -f "$ROOT/flowsound-backend/server.pid"
  echo "[flowsound] starting backend on :$PORT ..."
  cd "$ROOT/flowsound-backend"
  setsid nohup "$PY" -c "from app import app; app.run(host='$HOST', port=$PORT, threaded=True)" \
    >> server.log 2>&1 < /dev/null &
  echo $! > server.pid
fi

if ! port_up 3000; then
  echo "[flowsound] starting frontend on :3000 ..."
  cd "$ROOT/flowsound-frontend"
  setsid nohup npm run dev >> next.log 2>&1 < /dev/null &
  echo $! > next.pid
fi

echo -n "[flowsound] waiting for frontend"
for _ in $(seq 1 30); do
  if port_up 3000; then echo " okay"; break; fi
  echo -n "."
  sleep 1
done

URL="http://127.0.0.1:3000"
echo "[flowsound] FlowSound is at $URL"
command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL" >/dev/null 2>&1 || true