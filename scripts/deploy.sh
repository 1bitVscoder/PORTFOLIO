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
LOCK_DIR="/tmp/portfolio-deploy.lock"

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Deployment lock ─────────────────────────────────────────────
# mkdir is atomic on POSIX — prevents concurrent deploys
cleanup() { rmdir "$LOCK_DIR" 2>/dev/null || true; }
trap cleanup EXIT

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    fail "Another deployment is in progress. If not, run: rmdir $LOCK_DIR"
fi

# ─── Navigate to project directory ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

log "Deploying from: $PROJECT_DIR"
log "Git SHA: $(git rev-parse --short HEAD)"

# ─── Parse arguments ─────────────────────────────────────────────
BUILD_FLAGS=""
if [[ "${1:-}" == "--build" ]]; then
    BUILD_FLAGS="--no-cache"
    log "Force rebuild (no cache)"
fi

# ─── Pull latest code ────────────────────────────────────────────
log "Pulling latest code..."
git pull --ff-only || fail "Git pull failed. Resolve conflicts manually."

# ─── Build ────────────────────────────────────────────────────────
log "Building Docker image..."
docker compose -f "$COMPOSE_FILE" build $BUILD_FLAGS

# ─── Restart container ────────────────────────────────────────────
log "Restarting container..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans
docker compose -f "$COMPOSE_FILE" up -d

# ─── Health check ─────────────────────────────────────────────────
# No port exposed on host — check health via docker exec instead
log "Waiting for health check..."
for i in $(seq 1 "$HEALTH_TIMEOUT"); do
    if docker exec "$CONTAINER_NAME" wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health 2>/dev/null; then
        log "Health check passed! (${i}s)"
        break
    fi
    if [ "$i" -eq "$HEALTH_TIMEOUT" ]; then
        warn "Health check failed after ${HEALTH_TIMEOUT}s"
        warn "Container logs:"
        docker compose -f "$COMPOSE_FILE" logs --tail=20
        fail "Deployment failed — container is not healthy"
    fi
    sleep 1
done

# ─── Cleanup ──────────────────────────────────────────────────────
log "Cleaning up old images..."
docker image prune -f --filter "until=24h" > /dev/null 2>&1 || true

# ─── Done ─────────────────────────────────────────────────────────
log "Deployment complete!"
log "Site: https://portfolio.thecodeman.cloud"
log "SHA:  $(git rev-parse --short HEAD)"
