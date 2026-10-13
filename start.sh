#!/usr/bin/env bash

set -u -o pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
RUNTIME_DIR="$ROOT_DIR/.runtime"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"
BACKEND_LOG_FILE="$RUNTIME_DIR/backend.log"
FRONTEND_LOG_FILE="$RUNTIME_DIR/frontend.log"

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
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

registered_service_is_running() {
  local service=$1
  local pid_file pid

  case "$service" in
    backend) pid_file="$BACKEND_PID_FILE" ;;
    frontend) pid_file="$FRONTEND_PID_FILE" ;;
    *) return 1 ;;
  esac

  [[ -f $pid_file ]] || return 1
  IFS= read -r pid < "$pid_file" || true

  if pid_is_controlled "$service" "$pid"; then
    return 0
  fi

  log "Removing stale $service PID record."
  rm -f "$pid_file"
  return 1
}

port_is_in_use() {
  local port=$1
  ss -ltnH | awk -v port="$port" '$4 ~ (":" port "$") { found = 1 } END { exit !found }'
}

wait_for_postgres() {
  local container_id status attempt

  for attempt in $(seq 1 30); do
    container_id=$(docker compose ps -q postgres 2>/dev/null || true)
    if [[ -n $container_id ]]; then
      status=$(docker inspect --format '{{.State.Health.Status}}' "$container_id" 2>/dev/null || true)
      if [[ $status == healthy ]]; then
        return 0
      fi
    fi
    sleep 1
  done

  fail "PostgreSQL did not become healthy. Run 'docker compose ps' for details."
}

wait_for_service() {
  local service=$1
  local pid_file=$2
  local log_file=$3
  local port=$4
  local pid attempt

  IFS= read -r pid < "$pid_file"
  for attempt in $(seq 1 30); do
    if ! kill -0 "$pid" 2>/dev/null; then
      printf 'Error: %s stopped during startup. Last log lines:\n' "$service" >&2
      tail -n 30 "$log_file" >&2 || true
      return 1
    fi
    if ! port_is_in_use "$port"; then
      sleep 1
      continue
    fi
    return 0
  done

  printf 'Error: %s did not listen on port %s. Last log lines:\n' "$service" "$port" >&2
  tail -n 30 "$log_file" >&2 || true
  return 1
}

start_service() {
  local service=$1
  local workdir=$2
  local npm_script=$3
  local pid_file=$4
  local log_file=$5
  local port=$6
  local pid

  if registered_service_is_running "$service"; then
    IFS= read -r pid < "$pid_file"
    log "$service is already running under PID $pid."
    wait_for_service "$service" "$pid_file" "$log_file" "$port" || return 1
    return 0
  fi

  setsid bash -c 'cd "$1" && exec npm run "$2"' _ "$workdir" "$npm_script" >"$log_file" 2>&1 &
  pid=$!
  printf '%s\n' "$pid" > "$pid_file"
  log "Started $service under PID $pid."
  wait_for_service "$service" "$pid_file" "$log_file" "$port"
}

cd "$ROOT_DIR"

require_command docker
require_command node
require_command npm
require_command setsid
require_command ss
require_command awk

node_version=$(node -p 'process.versions.node')
if [[ ! $node_version =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || (( BASH_REMATCH[1] < 22 )) || { (( BASH_REMATCH[1] == 22 )) && (( BASH_REMATCH[2] < 12 )); }; then
  fail 'Node.js 22.12.0 or newer is required.'
fi
[[ -f backend/.env ]] || fail 'backend/.env is required. Create it from backend/.env.example.'
[[ -d backend/node_modules ]] || fail 'backend/node_modules is missing. Run npm ci in backend first.'
[[ -d frontend/node_modules ]] || fail 'frontend/node_modules is missing. Run npm ci in frontend first.'

mkdir -p "$RUNTIME_DIR"

backend_running=false
frontend_running=false
if registered_service_is_running backend; then
  backend_running=true
fi
if registered_service_is_running frontend; then
  frontend_running=true
fi

if [[ $backend_running == false ]] && port_is_in_use 3000; then
  fail 'Port 3000 is already in use by a process not controlled by this project.'
fi
if [[ $frontend_running == false ]] && port_is_in_use 5173; then
  fail 'Port 5173 is already in use by a process not controlled by this project.'
fi

log 'Starting PostgreSQL...'
docker compose up -d || fail 'Could not start PostgreSQL.'
wait_for_postgres
log 'PostgreSQL is healthy.'

if ! start_service backend "$ROOT_DIR/backend" start:dev "$BACKEND_PID_FILE" "$BACKEND_LOG_FILE" 3000; then
  fail 'Backend startup failed. Any started process remains recorded in .runtime.'
fi
if ! start_service frontend "$ROOT_DIR/frontend" dev "$FRONTEND_PID_FILE" "$FRONTEND_LOG_FILE" 5173; then
  fail 'Frontend startup failed. Any started process remains recorded in .runtime.'
fi

log 'Environment is ready.'
log 'Frontend: http://localhost:5173'
log 'Backend:  http://localhost:3000'
