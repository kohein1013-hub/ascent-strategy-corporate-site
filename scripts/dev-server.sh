#!/usr/bin/env bash
# Ascent dev server helper — ポート競合・二重起動によるメモリ枯渇を防ぐ
set -euo pipefail

PORTS=(3000 3001)

pids_on_port() {
  lsof -ti "tcp:$1" 2>/dev/null || true
}

cmd_status() {
  echo "=== Dev server status ==="
  for port in "${PORTS[@]}"; do
    local pids
    pids="$(pids_on_port "$port")"
    if [ -n "$pids" ]; then
      echo "Port $port: IN USE (PID: $pids)"
      ps -p $pids -o pid,rss,command 2>/dev/null | tail -n +2 | awk '{printf "  %.0f MB  %s\n", $2/1024, $3" "$4" "$5}'
    else
      echo "Port $port: free"
    fi
  done
  echo ""
  echo "Cursor RAM: $(ps -ax -o rss,comm | awk '/Cursor|cursor/ {sum+=$1} END {printf "%.1f GB", sum/1024/1024}')"
}

cmd_stop() {
  local stopped=0
  for port in "${PORTS[@]}"; do
    local pids
    pids="$(pids_on_port "$port")"
    if [ -n "$pids" ]; then
      echo "Stopping port $port (PID: $pids)"
      kill $pids 2>/dev/null || true
      stopped=1
    fi
  done
  if [ "$stopped" -eq 0 ]; then
    echo "No dev servers running on ports ${PORTS[*]}"
  else
    sleep 1
    cmd_status
  fi
}

case "${1:-status}" in
  status) cmd_status ;;
  stop)   cmd_stop ;;
  *)
    echo "Usage: $0 {status|stop}"
    exit 1
    ;;
esac
