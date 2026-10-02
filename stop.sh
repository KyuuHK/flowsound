#!/usr/bin/env bash
# Stop the FlowSound backend and frontend dev servers.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

kill_pgid() {
  local pidfile="$1"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      # setsid makes $! a process-group leader; kill the whole group so
      # npm wrappers (next dev -> next-server) don't orphan children.
      kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
      echo "[flowsound] stopped pid group $pid ($pidfile)"
    fi
    rm -f "$pidfile"
  fi
}

kill_pgid "$ROOT/flowsound-backend/server.pid"
kill_pgid "$ROOT/flowsound-frontend/next.pid"

# Mop up anything still holding the dev ports (stale orphans, manual starts).
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
echo "[flowsound] backend :5000 and frontend :3000 are down"