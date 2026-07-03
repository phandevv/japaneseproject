#!/bin/bash
# ==============================================================
# backup-db.sh — Backup H2 database file to S3 daily
#
# Setup on EC2:
#   1. Make sure EC2 instance has an IAM role with S3PutObject permission
#   2. chmod +x backup-db.sh
#   3. Add to crontab: 0 2 * * * /home/ec2-user/app/aws/backup-db.sh
#
# Required env var: S3_BUCKET (e.g. nihongocards-backup)
# ==============================================================

S3_BUCKET=${S3_BUCKET:?"S3_BUCKET env var is required"}
APP_DIR="${APP_DIR:-/home/ec2-user/app}"
DATA_DIR="${APP_DIR}/data"
BACKUP_NAME="flashcard-$(date +%Y%m%d-%H%M%S).mv.db"
LOG_FILE="${DATA_DIR}/logs/backup.log"

mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date)] Starting backup..." | tee -a "$LOG_FILE"

# The H2 file is named flashcard.mv.db
if [ ! -f "${DATA_DIR}/flashcard.mv.db" ]; then
    echo "[$(date)] ERROR: Database file not found at ${DATA_DIR}/flashcard.mv.db" | tee -a "$LOG_FILE"
    exit 1
fi

# Copy and compress the DB file
cp "${DATA_DIR}/flashcard.mv.db" "/tmp/${BACKUP_NAME}"
gzip "/tmp/${BACKUP_NAME}"

# Upload to S3
aws s3 cp "/tmp/${BACKUP_NAME}.gz" "s3://${S3_BUCKET}/backups/${BACKUP_NAME}.gz" \
    --storage-class STANDARD_IA

if [ $? -eq 0 ]; then
    echo "[$(date)] ✅ Backup successful: s3://${S3_BUCKET}/backups/${BACKUP_NAME}.gz" | tee -a "$LOG_FILE"
    rm -f "/tmp/${BACKUP_NAME}.gz"
else
    echo "[$(date)] ❌ Backup failed!" | tee -a "$LOG_FILE"
    exit 1
fi

# Keep only last 30 backups in S3
echo "[$(date)] Cleaning old backups (keeping last 30)..." | tee -a "$LOG_FILE"
aws s3 ls "s3://${S3_BUCKET}/backups/" | sort -r | tail -n +31 | \
    awk '{print $4}' | xargs -I{} aws s3 rm "s3://${S3_BUCKET}/backups/{}" 2>/dev/null

echo "[$(date)] Done." | tee -a "$LOG_FILE"
