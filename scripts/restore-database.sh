#!/bin/bash
#
# VvE Control - Database Restore Script
#
# Restores a database backup from the backup directory.
#

set -e  # Exit on error

# Configuration
BACKUP_ROOT="${HOME}/backups/vve-control"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[RESTORE]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[RESTORE WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[RESTORE ERROR]${NC} $1"
    exit 1
}

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <timestamp|latest>"
    echo ""
    echo "Available backups:"
    ls -t "$BACKUP_ROOT" | grep "^20" | head -10 | while read dir; do
        if [ -f "$BACKUP_ROOT/$dir/metadata.json" ]; then
            BRANCH=$(cat "$BACKUP_ROOT/$dir/metadata.json" | grep '"branch"' | cut -d'"' -f4)
            COMMIT=$(cat "$BACKUP_ROOT/$dir/metadata.json" | grep '"commit_hash"' | cut -d'"' -f4)
            echo "  $dir  ($BRANCH @ $COMMIT)"
        else
            echo "  $dir"
        fi
    done
    echo ""
    echo "Example: $0 latest"
    echo "Example: $0 20260124_143022"
    exit 1
fi

# Determine backup directory
if [ "$1" = "latest" ]; then
    BACKUP_DIR="$BACKUP_ROOT/latest"
    if [ ! -L "$BACKUP_DIR" ]; then
        error "No 'latest' backup found. Create a backup first."
    fi
else
    # Find backup by timestamp prefix
    BACKUP_DIR=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "$1*" | head -1)
    if [ -z "$BACKUP_DIR" ]; then
        error "Backup not found: $1"
    fi
fi

# Verify backup exists
if [ ! -d "$BACKUP_DIR" ]; then
    error "Backup directory not found: $BACKUP_DIR"
fi

if [ ! -f "$BACKUP_DIR/schema.sql" ] || [ ! -f "$BACKUP_DIR/data.sql" ]; then
    error "Incomplete backup (missing schema.sql or data.sql)"
fi

# Show backup info
log "Found backup:"
if [ -f "$BACKUP_DIR/metadata.json" ]; then
    cat "$BACKUP_DIR/metadata.json" | grep -E '"(timestamp|branch|commit_hash|backup_date)"' | sed 's/^/  /'
fi

echo ""
warn "⚠️  This will REPLACE your current database with the backup!"
warn "⚠️  Make sure you have a recent backup before proceeding."
echo ""
read -p "Continue with restore? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled."
    exit 0
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    error "Supabase CLI not found. Install it with: brew install supabase/tap/supabase"
fi

cd "$PROJECT_ROOT"

# Check if local Supabase is running
if ! supabase status &> /dev/null; then
    warn "Local Supabase not running. Starting..."
    supabase start
fi

# Get database URL
DB_URL=$(supabase status | grep "DB URL" | awk '{print $3}')

if [ -z "$DB_URL" ]; then
    error "Could not determine database URL"
fi

log "Restoring schema..."
psql "$DB_URL" < "$BACKUP_DIR/schema.sql" 2>&1 | tee restore.log

log "Restoring data..."
psql "$DB_URL" < "$BACKUP_DIR/data.sql" 2>&1 | tee -a restore.log

log "✓ Restore complete!"
log ""
log "Restore log saved to: restore.log"
log ""
log "To verify the restore:"
log "  supabase db diff"
log "  psql $DB_URL -c 'SELECT COUNT(*) FROM associations;'"

exit 0
