#!/usr/bin/env bash
# Dumps the mariadb_data volume to a timestamped .sql.gz file.
# No automated off-host upload — that step depends on where you deploy
# (S3, another server, etc). Run this via cron on the production host,
# e.g.: 0 3 * * * /path/to/scripts/backup-db.sh
set -euo pipefail

cd "$(dirname "$0")/.."
source .env

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/chat_voice_${TIMESTAMP}.sql.gz"

docker exec chat_voice_db mariadb-dump -uroot -p"$DB_ROOT_PASSWORD" chat_voice | gzip > "$OUT_FILE"

echo "Backup written to $OUT_FILE"

# Keep the last 14 local backups only — pair this with an off-host copy
# (S3, rsync to another host, etc) once real candidate data is involved,
# since a backup on the same disk as the DB doesn't survive a disk failure.
find "$BACKUP_DIR" -name 'chat_voice_*.sql.gz' -mtime +14 -delete
