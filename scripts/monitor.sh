#!/bin/bash
# Yemen National Labor Platform - Backup Script
# Automated backup of database and uploads

set -e

# Configuration
BACKUP_DIR="/opt/nlp/backups"
DB_CONTAINER="nlp-db"
DB_USER="nlp"
DB_NAME="nlp_production"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
log "Starting database backup..."
if docker ps | grep -q "$DB_CONTAINER"; then
    docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db-$TIMESTAMP.sql.gz"
    success "Database backup completed: db-$TIMESTAMP.sql.gz"
else
    error "Database container $DB_CONTAINER is not running"
fi

# Backup uploads
log "Starting uploads backup..."
if [ -d "/opt/nlp/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads-$TIMESTAMP.tar.gz" -C /opt/nlp uploads/
    success "Uploads backup completed: uploads-$TIMESTAMP.tar.gz"
fi

# Backup configuration
log "Backing up configuration..."
if [ -f "/opt/nlp/docker-compose.yml" ]; then
    cp /opt/nlp/docker-compose.yml "$BACKUP_DIR/compose-$TIMESTAMP.yml"
    success "Configuration backed up"
fi

# Clean up old backups
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.yml" -mtime +$RETENTION_DAYS -delete

success "Backup process completed"
