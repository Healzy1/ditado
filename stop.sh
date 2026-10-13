#!/usr/bin/env bash

set -u -o pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
RUNTIME_DIR="$ROOT_DIR/.runtime"

log() {
  printf '%s\n' "$*"
}

pid_is_controlled() {
  local service=$1
  local pid=$2
  local expected_dir expected_command process_dir process_command session_id

  case "$service" in
    backend)
      expected_dir="$ROOT_DIR/backend"
      expected_command='npm run start:dev'
      ;;
    frontend)
      expected_dir="$ROOT_DIR/frontend"
      expected_command='npm run dev'
      ;;
    *) return 1 ;;
  esac

  [[ $pid =~ ^[1-9][0-9]*$ ]] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  process_dir=$(readlink -f "/proc/$pid/cwd" 2>/dev/null) || return 1
  process_command=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null) || return 1
  session_id=$(ps -o sid= -p "$pid" 2>/dev/null | tr -d ' ')

  [[ $process_dir == "$expected_dir" ]] || return 1
  [[ $process_command == *"$expected_command"* ]] || return 1
  [[ $session_id == "$pid" ]]
}

stop_service() {
  local service=$1
  local pid_file="$RUNTIME_DIR/$service.pid"
  local pid attempt

  [[ -f $pid_file ]] || {
    log "No $service PID record found."
    return 0
  }

  IFS= read -r pid < "$pid_file" || true
  if ! pid_is_controlled "$service" "$pid"; then
    log "Removing stale $service PID record without stopping any process."
    rm -f "$pid_file"
    return 0
  fi

  log "Stopping $service process group $pid."
  if ! kill -- "-$pid"; then
    printf 'Error: could not stop the controlled %s process group.\n' "$service" >&2
    return 1
  fi
  for attempt in $(seq 1 10); do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pid_file"
      return 0
    fi
    sleep 1
  done

  log "$service did not stop after 10 seconds; sending SIGKILL to its controlled process group."
  if ! kill -KILL -- "-$pid" 2>/dev/null; then
    printf 'Error: could not force-stop the controlled %s process group.\n' "$service" >&2
    return 1
  fi

  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    printf 'Error: controlled %s process group is still running.\n' "$service" >&2
    return 1
  fi

  rm -f "$pid_file"
}

cd "$ROOT_DIR"

status=0
stop_service frontend || status=1
stop_service backend || status=1

if command -v docker >/dev/null 2>&1; then
  log 'Stopping PostgreSQL without removing its volume.'
  docker compose down || status=1
else
  printf 'Warning: docker is unavailable; PostgreSQL was not stopped.\n' >&2
  status=1
fi

exit "$status"
