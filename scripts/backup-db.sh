#!/bin/bash
# Backs up the SQLite database. Run manually or set up as a daily cron job.
#
# To schedule daily backups at 2am, add to crontab (run: crontab -e):
#   0 2 * * * /home/snie/Projects/family-chat-local-ai/scripts/backup-db.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="$PROJECT_DIR/server/prisma/dev.db"
BACKUP_DIR="$HOME/family-chat-backups"
DATE=$(date +%Y%m%d_%H%M%S)

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/dev_$DATE.db"

# Keep only the last 30 backups
ls -t "$BACKUP_DIR"/*.db 2>/dev/null | tail -n +31 | xargs -r rm

echo "Backup saved: $BACKUP_DIR/dev_$DATE.db"
echo "Total backups: $(ls "$BACKUP_DIR"/*.db | wc -l)"
