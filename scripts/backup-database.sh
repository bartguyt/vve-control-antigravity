#!/bin/bash
#
# VvE Control - Database Backup Script
#
# Creates a full database dump after merges to main branch.
# Backups are stored outside the repo for security.
#

set -e  # Exit on error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${HOME}/backups/vve-control"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)
COMMIT_HASH=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[BACKUP WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[BACKUP ERROR]${NC} $1"
    exit 1
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    error "Supabase CLI not found. Install it with: brew install supabase/tap/supabase"
fi

# Create backup directory structure
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}_${BRANCH}_${COMMIT_HASH}"
mkdir -p "$BACKUP_DIR"

log "Starting database backup..."
log "Branch: $BRANCH"
log "Commit: $COMMIT_HASH"
log "Backup location: $BACKUP_DIR"

# Check if we're in a Supabase project
if [ ! -f "$PROJECT_ROOT/supabase/config.toml" ]; then
    error "Not a Supabase project (config.toml not found)"
fi

# Export database schema
log "Exporting database schema..."
cd "$PROJECT_ROOT"
supabase db dump -f "$BACKUP_DIR/schema.sql" 2>&1 | tee "$BACKUP_DIR/backup.log" || warn "Schema dump completed with warnings"

# Export database data (including seed data)
log "Exporting database data..."
supabase db dump --data-only -f "$BACKUP_DIR/data.sql" 2>&1 | tee -a "$BACKUP_DIR/backup.log" || warn "Data dump completed with warnings"

# Create metadata file
log "Creating backup metadata..."
cat > "$BACKUP_DIR/metadata.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "branch": "$BRANCH",
  "commit_hash": "$COMMIT_HASH",
  "commit_message": "$(git -C "$PROJECT_ROOT" log -1 --pretty=%B)",
  "backup_date": "$(date -Iseconds)",
  "project_path": "$PROJECT_ROOT",
  "backup_type": "full",
  "triggered_by": "git-hook"
}
EOF

# Get backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

# Create a "latest" symlink for easy access
ln -sf "$BACKUP_DIR" "${BACKUP_ROOT}/latest"

# Cleanup old backups (keep last 30 days)
log "Cleaning up old backups (keeping last 30 days)..."
find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*" -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*" | wc -l | tr -d ' ')

log "✓ Backup complete!"
log "  Size: $BACKUP_SIZE"
log "  Location: $BACKUP_DIR"
log "  Total backups: $BACKUP_COUNT"
log ""
log "To restore this backup:"
log "  cd $PROJECT_ROOT"
log "  psql \$DATABASE_URL < $BACKUP_DIR/schema.sql"
log "  psql \$DATABASE_URL < $BACKUP_DIR/data.sql"
log ""
log "Or use the quick restore alias:"
log "  restore-vve-backup $TIMESTAMP"

# Optional: Create encrypted archive
if [ "${VVE_ENCRYPT_BACKUPS:-false}" = "true" ]; then
    if command -v gpg &> /dev/null; then
        log "Creating encrypted archive..."
        tar czf - -C "$BACKUP_ROOT" "$(basename "$BACKUP_DIR")" | \
            gpg --symmetric --cipher-algo AES256 -o "${BACKUP_DIR}.tar.gz.gpg"
        log "✓ Encrypted archive: ${BACKUP_DIR}.tar.gz.gpg"
    else
        warn "GPG not installed, skipping encryption"
    fi
fi

exit 0
