#!/bin/bash
# ==============================================================
# backup-db.sh — Backup MySQL database to S3 daily
#
# Setup on EC2:
#   1. Make sure EC2 instance has an IAM role with S3PutObject permission
#   2. chmod +x backup-db.sh
#   3. Add to crontab: 0 2 * * * /home/ec2-user/app/aws/backup-db.sh
#
# ==============================================================

APP_DIR="${APP_DIR:-/home/ec2-user/app}"
DATA_DIR="${APP_DIR}/data"
LOG_FILE="${DATA_DIR}/logs/backup.log"

mkdir -p "$(dirname "$LOG_FILE")"

# Load environment variables from .env file
if [ -f "${APP_DIR}/.env" ]; then
    set -a
    source "${APP_DIR}/.env"
    set +a
else
    echo "[$(date)] ERROR: .env file not found at ${APP_DIR}/.env" | tee -a "$LOG_FILE"
    exit 1
fi

S3_BUCKET=${S3_BUCKET:?"S3_BUCKET env var is required in .env or environment"}
BACKUP_NAME="flashcard-$(date +%Y%m%d-%H%M%S).sql"

echo "[$(date)] Starting MySQL backup..." | tee -a "$LOG_FILE"

# Extract DB Host and DB Name from DB_URL
if [[ "$DB_URL" =~ jdbc:mysql://([^:/]+)(:[0-9]+)?/([^?]+) ]]; then
    DB_HOST="${BASH_REMATCH[1]}"
    DB_NAME="${BASH_REMATCH[3]}"
else
    echo "[$(date)] ERROR: Failed to parse DB_URL: $DB_URL" | tee -a "$LOG_FILE"
    exit 1
fi

# Run mysqldump and output to tmp file
if command -v mysqldump &> /dev/null; then
    export MYSQL_PWD="$DB_PASSWORD"
    mysqldump -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" > "/tmp/${BACKUP_NAME}" 2>> "$LOG_FILE"
else
    echo "[$(date)] mysqldump not found on host, running via Docker mysql:8.0..." | tee -a "$LOG_FILE"
    docker run --rm \
      -e MYSQL_PWD="$DB_PASSWORD" \
      mysql:8.0 \
      mysqldump -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" > "/tmp/${BACKUP_NAME}" 2>> "$LOG_FILE"
fi

if [ $? -ne 0 ] || [ ! -s "/tmp/${BACKUP_NAME}" ]; then
    echo "[$(date)] ERROR: mysqldump failed or generated empty file!" | tee -a "$LOG_FILE"
    rm -f "/tmp/${BACKUP_NAME}"
    exit 1
fi

# Compress the backup file
gzip "/tmp/${BACKUP_NAME}"

# Upload to S3
aws s3 cp "/tmp/${BACKUP_NAME}.gz" "s3://${S3_BUCKET}/backups/${BACKUP_NAME}.gz" \
    --storage-class STANDARD_IA

if [ $? -eq 0 ]; then
    echo "[$(date)] ✅ Backup successful: s3://${S3_BUCKET}/backups/${BACKUP_NAME}.gz" | tee -a "$LOG_FILE"
    rm -f "/tmp/${BACKUP_NAME}.gz"
else
    echo "[$(date)] ❌ Backup upload to S3 failed!" | tee -a "$LOG_FILE"
    rm -f "/tmp/${BACKUP_NAME}.gz"
    exit 1
fi

# Keep only last 30 backups in S3
echo "[$(date)] Cleaning old backups in S3 (keeping last 30)..." | tee -a "$LOG_FILE"
aws s3 ls "s3://${S3_BUCKET}/backups/" | sort -r | tail -n +31 | \
    awk '{print $4}' | xargs -I{} aws s3 rm "s3://${S3_BUCKET}/backups/{}" 2>/dev/null

echo "[$(date)] Done." | tee -a "$LOG_FILE"
