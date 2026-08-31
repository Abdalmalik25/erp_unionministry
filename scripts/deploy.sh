#!/bin/bash
# Yemen National Labor Platform - Production Deployment Script

set -e

# Configuration
DEPLOY_DIR="/opt/nlp"
SERVICE_NAME="nlp-app"
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/opt/nlp/backups"
LOG_FILE="/var/log/nlp-deploy.log"
HEALTH_CHECK_URL="http://localhost:3000/health"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Print colored status
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Error handler
error_exit() {
    print_status "$RED" "❌ ERROR: $1"
    log "ERROR" "$1"
    exit 1
}

# Success message
success() {
    print_status "$GREEN" "✅ $1"
    log "INFO" "$1"
}

# Warning message
warning() {
    print_status "$YELLOW" "⚠️  $1"
    log "WARN" "$1"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root or with sudo"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error_exit "Docker Compose is not installed"
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        error_exit "curl is not installed"
    fi
    
    success "Prerequisites check passed"
}

# Create backup of current deployment
create_backup() {
    log "INFO" "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Backup database
    if docker ps | grep -q nlp-db; then
        log "INFO" "Backing up database..."
        docker exec nlp-db pg_dump -U nlp nlp_production | gzip > "$backup_path-db.sql.gz"
        success "Database backup created: $backup_path-db.sql.gz"
    fi
    
    # Backup uploads
    if [ -d "$DEPLOY_DIR/uploads" ]; then
        log "INFO" "Backing up uploads..."
        tar -czf "$backup_path-uploads.tar.gz" -C "$DEPLOY_DIR" uploads/ 2>/dev/null || true
    fi
    
    # Save current docker-compose config
    if [ -f "$DEPLOY_DIR/$COMPOSE_FILE" ]; then
        cp "$DEPLOY_DIR/$COMPOSE_FILE" "$backup_path-compose.yml"
    fi
    
    # Cleanup old backups (keep last 10)
    cd "$BACKUP_DIR"
    ls -t backup-* 2>/dev/null | tail -n +11 | xargs -r rm -f
    cd - > /dev/null
    
    success "Backup completed"
}

# Pull latest code
pull_code() {
    log "INFO" "Pulling latest code..."
    
    cd "$DEPLOY_DIR"
    
    # Stash local changes
    git stash --include-untracked || true
    
    # Pull latest
    git pull origin main || error_exit "Failed to pull latest code"
    
    success "Code updated"
}

# Build and deploy
deploy() {
    log "INFO" "Starting deployment..."
    
    cd "$DEPLOY_DIR"
    
    # Build images
    log "INFO" "Building Docker images..."
    docker-compose build --no-cache || error_exit "Docker build failed"
    
    # Stop existing services (if running)
    log "INFO" "Stopping existing services..."
    docker-compose down --remove-orphans || true
    
    # Start new services
    log "INFO" "Starting services..."
    docker-compose up -d || error_exit "Failed to start services"
    
    success "Services started"
}

# Run database migrations
run_migrations() {
    log "INFO" "Running database migrations..."
    
    # Wait for database to be ready
    sleep 5
    
    docker exec nlp-app node scripts/apply-migration.cjs || warning "Migration may have failed"
    
    success "Migrations completed"
}

# Health check
health_check() {
    log "INFO" "Performing health check..."
    
    local retries=0
    while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            success "Health check passed"
            return 0
        fi
        
        retries=$((retries + 1))
        log "INFO" "Health check attempt $retries/$HEALTH_CHECK_RETRIES failed, retrying in ${HEALTH_CHECK_INTERVAL}s..."
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    error_exit "Health check failed after $HEALTH_CHECK_RETRIES attempts"
}

# Cleanup old Docker images
cleanup() {
    log "INFO" "Cleaning up old Docker images..."
    docker image prune -f
    success "Cleanup completed"
}

# Send notification
notify() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"[$status] NLP Platform: $message\"}" \
            > /dev/null 2>&1 || true
    fi
    
    log "INFO" "Notification sent: $status - $message"
}

# Main deployment function
main() {
    local environment=${1:-production}
    
    print_status "$GREEN" "🚀 Starting NLP Platform deployment to $environment..."
    log "INFO" "========================================="
    log "INFO" "Deployment started for environment: $environment"
    log "INFO" "========================================="
    
    check_permissions
    check_prerequisites
    create_backup
    pull_code
    deploy
    run_migrations
    health_check
    cleanup
    
    print_status "$GREEN" "🎉 Deployment completed successfully!"
    notify "SUCCESS" "Deployment to $environment completed successfully"
    
    log "INFO" "========================================="
    log "INFO" "Deployment completed"
    log "INFO" "========================================="
}

# Rollback function
rollback() {
    print_status "$YELLOW" "🔄 Rolling back deployment..."
    log "WARN" "Rollback initiated"
    
    cd "$DEPLOY_DIR"
    
    # Get latest backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/backup-* 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error_exit "No backup found for rollback"
    fi
    
    # Stop services
    docker-compose down
    
    # Restore database if backup exists
    local db_backup="${latest_backup}-db.sql.gz"
    if [ -f "$db_backup" ]; then
        log "INFO" "Restoring database..."
        gunzip -c "$db_backup" | docker exec -i nlp-db psql -U nlp nlp_production
    fi
    
    # Restore uploads if backup exists
    local uploads_backup="${latest_backup}-uploads.tar.gz"
    if [ -f "$uploads_backup" ]; then
        log "INFO" "Restoring uploads..."
        tar -xzf "$uploads_backup" -C "$DEPLOY_DIR"
    fi
    
    # Restart services
    docker-compose up -d
    
    # Health check
    health_check
    
    print_status "$GREEN" "✅ Rollback completed"
    notify "WARNING" "Rollback completed"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main "${2:-production}"
        ;;
    rollback)
        rollback
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {deploy [environment]|rollback|health}"
        echo "  deploy [environment]  - Deploy the application (default: production)"
        echo "  rollback              - Rollback to the previous version"
        echo "  health                - Check application health"
        exit 1
        ;;
esac
