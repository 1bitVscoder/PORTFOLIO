#!/usr/bin/env bash
#
# deploy.sh — Simple deployment script for portfolio site
#
# Usage:
#   ./scripts/deploy.sh          # Deploy latest from current branch
#   ./scripts/deploy.sh --build  # Force rebuild (skip cache)
#

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────
COMPOSE_FILE="docker-compose.production.yml"
CONTAINER_NAME="portfolio"
HEALTH_TIMEOUT=30
LOCK_FILE="/tmp/portfolio-deploy.lock"

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Deployment lock ─────────────────────────────────────────────
# PID-based lock file logic — prevents stale locks from blocking deploys
cleanup() { rm -f "$LOCK_FILE" 2>/dev/null || true; }
trap cleanup EXIT

if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        fail "Another deployment (PID $PID) is already running."
    fi
    warn "Removing stale lock file for PID $PID"
    rm -f "$LOCK_FILE"
fi
echo "$$" > "$LOCK_FILE"

# ─── Navigate to project directory ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

log "Deploying from: $PROJECT_DIR"
log "Git SHA: $(git rev-parse --short HEAD)"

# ─── Detect Docker / Compose Command ─────────────────────────────
# Detect if sudo is needed for docker commands
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
    if sudo -n docker info >/dev/null 2>&1; then
        DOCKER="sudo docker"
        log "Using sudo for docker commands"
    else
        warn "Docker permissions check failed. Will attempt without sudo."
    fi
fi

# Detect docker compose vs docker-compose
if $DOCKER compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="$DOCKER compose"
elif docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
elif sudo -n docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="sudo docker-compose"
else
    fail "Neither 'docker compose' nor 'docker-compose' command could be found."
fi

log "Using Compose command: $DOCKER_COMPOSE"

# ─── Create external network if missing ─────────────────────────
if ! $DOCKER network inspect proxy-net >/dev/null 2>&1; then
    log "Creating external network 'proxy-net'..."
    $DOCKER network create proxy-net || warn "Could not create 'proxy-net' network. It might already exist or need admin setup."
fi

# ─── Parse arguments ─────────────────────────────────────────────
BUILD_FLAGS=""
if [[ "${1:-}" == "--build" ]]; then
    BUILD_FLAGS="--no-cache"
    log "Force rebuild (no cache)"
fi

# ─── Pull latest code ────────────────────────────────────────────
log "Pulling latest code..."
git fetch origin
git checkout -B main origin/main || git checkout main
git reset --hard origin/main

# ─── Build ────────────────────────────────────────────────────────
log "Building Docker image..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" build $BUILD_FLAGS

# ─── Restart container ────────────────────────────────────────────
log "Restarting container..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" down --remove-orphans
$DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d

# ─── Health check ─────────────────────────────────────────────────
# No port exposed on host — check health via docker exec instead
log "Waiting for health check..."
for i in $(seq 1 "$HEALTH_TIMEOUT"); do
    if $DOCKER exec "$CONTAINER_NAME" wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health 2>/dev/null; then
        log "Health check passed! (${i}s)"
        break
    fi
    if [ "$i" -eq "$HEALTH_TIMEOUT" ]; then
        warn "Health check failed after ${HEALTH_TIMEOUT}s"
        warn "Container logs:"
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=20
        fail "Deployment failed — container is not healthy"
    fi
    sleep 1
done

# ─── Cleanup ──────────────────────────────────────────────────────
log "Cleaning up old images..."
$DOCKER image prune -f --filter "until=24h" > /dev/null 2>&1 || true

# ─── Done ─────────────────────────────────────────────────────────
log "Deployment complete!"
log "Site: https://portfolio.thecodeman.cloud"
log "SHA:  $(git rev-parse --short HEAD)"
