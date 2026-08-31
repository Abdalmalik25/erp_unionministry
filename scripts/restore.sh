#!/bin/bash
# Yemen National Labor Platform - Restore Script

set -e

BACKUP_DIR="/opt/nlp/backups"
DB_CONTAINER="nlp-db"
DB_USER="nlp"
DB_NAME="nlp_production"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# List available backups
list_backups() {
    echo "Available database backups:"
    echo "============================"
    ls -lh "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | awk '{print $9, $5}' || echo "No backups found"
}

# Restore database
restore_database() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  This will overwrite the current database!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi
    
    echo "Restoring database from $backup_file..."
    
    # Stop application to prevent connections
    echo "Stopping application..."
    docker stop nlp-app || true
    
    # Drop and recreate database
    echo "Resetting database..."
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
    
    # Restore backup
    echo "Restoring backup..."
    gunzip -c "$backup_file" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME"
    
    # Restart application
    echo "Starting application..."
    docker start nlp-app
    
    echo -e "${GREEN}✅ Database restored successfully${NC}"
}

# Restore uploads
restore_uploads() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    echo "Restoring uploads from $backup_file..."
    tar -xzf "$backup_file" -C /opt/nlp/
    
    echo -e "${GREEN}✅ Uploads restored successfully${NC}"
}

# Main
case "${1:-list}" in
    list)
        list_backups
        ;;
    db)
        restore_database "$2"
        ;;
    uploads)
        restore_uploads "$2"
        ;;
    *)
        echo "Usage: $0 {list|db <backup-file>|uploads <backup-file>}"
        exit 1
        ;;
esac
