#!/bin/bash
# =============================================================================
# RTMN BrandPulse - Backup Script
# =============================================================================
# Creates backups of MongoDB and Redis data, uploads to S3
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
S3_BUCKET="${S3_BUCKET_NAME:-rtmn-backups}"
S3_REGION="${S3_BUCKET_REGION:-us-east-1}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Environment variables (from .env.prod or environment)
MONGODB_URI="${MONGODB_URI:-}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    fi
}

# Help message
show_help() {
    cat << 'EOF'
RTMN BrandPulse - Backup Script

Usage: $0 [OPTIONS]

Options:
    --backup-dir DIR          Backup directory (default: /backups)
    --retention-days DAYS     Days to keep local backups (default: 7)
    --s3-bucket BUCKET        S3 bucket name (default: rtmn-backups)
    --s3-region REGION        S3 region (default: us-east-1)
    --skip-mongodb            Skip MongoDB backup
    --skip-redis              Skip Redis backup
    --skip-s3                 Skip S3 upload
    --skip-cleanup            Skip old backup cleanup
    --debug                   Enable debug output
    -h, --help                Show this help message

Environment Variables:
    MONGODB_URI               MongoDB connection string
    REDIS_HOST                Redis host (default: redis)
    REDIS_PORT                Redis port (default: 6379)
    REDIS_PASSWORD            Redis password
    AWS_ACCESS_KEY_ID         AWS access key
    AWS_SECRET_ACCESS_KEY     AWS secret key
    S3_BUCKET_NAME            S3 bucket name
    S3_BUCKET_REGION          S3 region

Examples:
    $0                                    # Full backup with S3 upload
    $0 --skip-s3                          # Backup locally only
    $0 --retention-days 14                # Keep backups for 14 days
    $0 --skip-redis --skip-mongodb        # S3 cleanup only

EOF
}

# Parse arguments
SKIP_MONGODB=false
SKIP_REDIS=false
SKIP_S3=false
SKIP_CLEANUP=false
DEBUG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --retention-days)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --s3-bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        --s3-region)
            S3_REGION="$2"
            shift 2
            ;;
        --skip-mongodb)
            SKIP_MONGODB=true
            shift
            ;;
        --skip-redis)
            SKIP_REDIS=true
            shift
            ;;
        --skip-s3)
            SKIP_S3=true
            shift
            ;;
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required commands
    local missing_cmds=()

    if [[ "$SKIP_MONGODB" != "true" ]]; then
        if ! command -v mongodump &> /dev/null; then
            missing_cmds+=("mongodump")
        fi
        if ! command -v mongosh &> /dev/null; then
            missing_cmds+=("mongosh")
        fi
    fi

    if [[ "$SKIP_REDIS" != "true" ]]; then
        if ! command -v redis-cli &> /dev/null; then
            missing_cmds+=("redis-cli")
        fi
    fi

    if ! command -v tar &> /dev/null; then
        missing_cmds+=("tar")
    fi

    if ! command -v gzip &> /dev/null; then
        missing_cmds+=("gzip")
    fi

    if [[ "$SKIP_S3" != "true" ]]; then
        if ! command -v aws &> /dev/null; then
            missing_cmds+=("aws")
        fi
    fi

    if [[ ${#missing_cmds[@]} -gt 0 ]]; then
        log_warning "Missing commands: ${missing_cmds[*]}"
        log_info "Install with: brew install ${missing_cmds[*]}"
    fi

    # Check MongoDB URI
    if [[ "$SKIP_MONGODB" != "true" && -z "$MONGODB_URI" ]]; then
        log_warning "MONGODB_URI not set, MongoDB backup will be skipped"
        SKIP_MONGODB=true
    fi

    # Check AWS credentials
    if [[ "$SKIP_S3" != "true" ]]; then
        if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
            log_warning "AWS credentials not set, S3 upload will be skipped"
            SKIP_S3=true
        fi
    fi

    log_success "Prerequisites check complete"
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory: $BACKUP_PATH"
    mkdir -p "$BACKUP_PATH"

    if [[ ! -d "$BACKUP_PATH" ]]; then
        log_error "Failed to create backup directory"
        exit 1
    fi

    log_success "Backup directory created"
}

# Backup MongoDB
backup_mongodb() {
    if [[ "$SKIP_MONGODB" == "true" ]]; then
        log_info "Skipping MongoDB backup (--skip-mongodb)"
        return 0
    fi

    log_info "Starting MongoDB backup..."

    local mongodb_dir="$BACKUP_PATH/mongodb"

    # Create MongoDB backup directory
    mkdir -p "$mongodb_dir"

    # Run mongodump
    log_info "Running mongodump..."

    # Parse MongoDB URI to extract options
    local mongodump_opts="--archive=$mongodb_dir/backup.archive"

    if [[ "$MONGODB_URI" == *"mongodb+srv://"* ]]; then
        # SRV connection (Atlas)
        mongodump_opts="$mongodump_opts --uri='$MONGODB_URI'"
    else
        # Standard connection
        mongodump_opts="$mongodump_opts --uri='$MONGODB_URI'"
    fi

    log_debug "Running: mongodump $mongodump_opts"

    if mongodump $mongodump_opts 2>&1; then
        log_success "MongoDB backup completed"
    else
        log_warning "MongoDB backup failed, trying alternative method..."

        # Fallback: backup specific databases
        local db_name=$(echo "$MONGODB_URI" | grep -oP '(?<=/)[^?]+' | head -1 || echo "brandpulse")
        if mongodump --uri="$MONGODB_URI" --db="$db_name" --out="$mongodb_dir" 2>&1; then
            log_success "MongoDB backup completed (alternative method)"
        else
            log_error "MongoDB backup failed"
            return 1
        fi
    fi

    # Create metadata file
    cat > "$mongodb_dir/METADATA.json" << 'METADATA_EOF'
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)",
    "mongodb_uri": "[REDACTED]",
    "backup_type": "mongodump",
    "compressed": false
}
METADATA_EOF

    log_debug "MongoDB backup size: $(du -sh "$mongodb_dir" 2>/dev/null | cut -f1)"
}

# Backup Redis
backup_redis() {
    if [[ "$SKIP_REDIS" == "true" ]]; then
        log_info "Skipping Redis backup (--skip-redis)"
        return 0
    fi

    log_info "Starting Redis backup..."

    local redis_dir="$BACKUP_PATH/redis"

    # Create Redis backup directory
    mkdir -p "$redis_dir"

    # Trigger BGSAVE
    log_info "Triggering Redis BGSAVE..."

    local redis_cmd="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
    if [[ -n "$REDIS_PASSWORD" ]]; then
        redis_cmd="$redis_cmd -a $REDIS_PASSWORD"
    fi

    # Check Redis connection
    if ! $redis_cmd ping 2>/dev/null | grep -q "PONG"; then
        log_warning "Redis ping failed, trying without authentication..."
        redis_cmd="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
    fi

    # Trigger background save
    $redis_cmd BGSAVE 2>/dev/null || log_warning "BGSAVE command failed (may already be running)"

    # Wait for save to complete (max 60 seconds)
    log_info "Waiting for Redis save to complete..."
    local wait_count=0
    while [[ $wait_count -lt 60 ]]; do
        local last_save=$($redis_cmd LASTSAVE 2>/dev/null)
        sleep 1
        local new_last_save=$($redis_cmd LASTSAVE 2>/dev/null)

        if [[ "$last_save" == "$new_last_save" ]]; then
            # Save completed
            break
        fi

        wait_count=$((wait_count + 1))
    done

    # Copy RDB file if available
    log_info "Copying Redis data files..."

    # Try to get RDB file via CONFIG GET
    local rdb_path=$($redis_cmd CONFIG GET dir 2>/dev/null | tail -1)
    if [[ -n "$rdb_path" && -f "$rdb_path/dump.rdb" ]]; then
        cp "$rdb_path/dump.rdb" "$redis_dir/redis.rdb"
        log_success "Redis RDB file copied"
    else
        # Try container path
        if [[ -f "/data/dump.rdb" ]]; then
            cp /data/dump.rdb "$redis_dir/redis.rdb"
            log_success "Redis RDB file copied (container path)"
        else
            log_warning "Could not locate Redis RDB file"
        fi
    fi

    # Export keys info
    log_info "Exporting Redis keys info..."
    $redis_cmd INFO keyspace > "$redis_dir/keyspace.txt" 2>/dev/null || true
    $redis_cmd KEYS "*" > "$redis_dir/keys.txt" 2>/dev/null || true

    # Create metadata file
    cat > "$redis_dir/METADATA.json" << 'METADATA_EOF'
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)",
    "redis_host": "$REDIS_HOST",
    "redis_port": "$REDIS_PORT",
    "backup_type": "rdb",
    "compressed": false
}
METADATA_EOF

    log_success "Redis backup completed"
}

# Create backup archive
create_archive() {
    log_info "Creating backup archive..."

    local archive_path="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

    # Create tar archive (excluding METADATA.json from sensitive data)
    tar -czf "$archive_path" \
        -C "$BACKUP_PATH" \
        --exclude='*.archive' \
        . 2>/dev/null || true

    # If tar failed, try individual directories
    if [[ ! -f "$archive_path" || ! -s "$archive_path" ]]; then
        log_info "Creating individual archives..."

        if [[ "$SKIP_MONGODB" != "true" && -d "$BACKUP_PATH/mongodb" ]]; then
            tar -czf "${BACKUP_PATH}/mongodb.tar.gz" -C "$BACKUP_PATH" mongodb 2>/dev/null || true
        fi

        if [[ "$SKIP_REDIS" != "true" && -d "$BACKUP_PATH/redis" ]]; then
            tar -czf "${BACKUP_PATH}/redis.tar.gz" -C "$BACKUP_PATH" redis 2>/dev/null || true
        fi
    fi

    log_success "Backup archive created: $archive_path"
    log_info "Archive size: $(du -sh "$archive_path" 2>/dev/null | cut -f1)"
}

# Upload to S3
upload_to_s3() {
    if [[ "$SKIP_S3" == "true" ]]; then
        log_info "Skipping S3 upload (--skip-s3)"
        return 0
    fi

    log_info "Uploading backup to S3..."

    local s3_path="s3://${S3_BUCKET}/$(date +%Y/%m/%d)/${BACKUP_NAME}.tar.gz"
    local archive_path="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

    # Set AWS credentials
    export AWS_ACCESS_KEY_ID
    export AWS_SECRET_ACCESS_KEY
    export AWS_DEFAULT_REGION="$S3_REGION"

    # Create S3 directory structure
    log_info "Ensuring S3 bucket structure exists..."

    # Upload archive
    if [[ -f "$archive_path" ]]; then
        log_info "Uploading: $archive_path"
        log_info "To: $s3_path"

        if aws s3 cp "$archive_path" "$s3_path" --storage-class STANDARD_IA; then
            log_success "Archive uploaded to S3"
        else
            log_error "Failed to upload archive to S3"
            return 1
        fi
    fi

    # Upload individual backups if they exist
    if [[ -f "${BACKUP_PATH}/mongodb.tar.gz" ]]; then
        local mongo_s3_path="s3://${S3_BUCKET}/$(date +%Y/%m/%d)/mongodb_${BACKUP_NAME}.tar.gz"
        aws s3 cp "${BACKUP_PATH}/mongodb.tar.gz" "$mongo_s3_path" --storage-class STANDARD_IA 2>/dev/null || true
    fi

    if [[ -f "${BACKUP_PATH}/redis.tar.gz" ]]; then
        local redis_s3_path="s3://${S3_BUCKET}/$(date +%Y/%m/%d)/redis_${BACKUP_NAME}.tar.gz"
        aws s3 cp "${BACKUP_PATH}/redis.tar.gz" "$redis_s3_path" --storage-class STANDARD_IA 2>/dev/null || true
    fi

    log_success "S3 upload complete"
}

# Cleanup old backups
cleanup_old_backups() {
    if [[ "$SKIP_CLEANUP" == "true" ]]; then
        log_info "Skipping old backup cleanup (--skip-cleanup)"
        return 0
    fi

    log_info "Cleaning up old local backups (retention: $RETENTION_DAYS days)..."

    # Find and delete old backup directories
    local deleted_count=0
    local deleted_size=0

    # Clean up old directories
    while IFS= read -r -d '' dir; do
        local dir_age=$(find "$dir" -maxdepth 0 -type d -mtime +"$RETENTION_DAYS" 2>/dev/null)
        if [[ -n "$dir_age" ]]; then
            local dir_size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo "0")
            rm -rf "$dir"
            log_info "Deleted old backup: $dir ($(numfmt --to=iec-i --suffix=B "$dir_size" 2>/dev/null || echo "${dir_size} bytes"))"
            deleted_count=$((deleted_count + 1))
            deleted_size=$((deleted_size + dir_size))
        fi
    done < <(find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" -print0 2>/dev/null)

    # Clean up old archive files
    while IFS= read -r -d '' archive; do
        local archive_age=$(find "$archive" -type f -mtime +"$RETENTION_DAYS" 2>/dev/null)
        if [[ -n "$archive_age" ]]; then
            local archive_size=$(stat -f%z "$archive" 2>/dev/null || stat -c%s "$archive" 2>/dev/null || echo "0")
            rm -f "$archive"
            log_info "Deleted old archive: $archive"
            deleted_count=$((deleted_count + 1))
            deleted_size=$((deleted_size + archive_size))
        fi
    done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name "backup_*.tar.gz" -print0 2>/dev/null)

    if [[ $deleted_count -gt 0 ]]; then
        log_success "Cleaned up $deleted_count old backup(s)"
    else
        log_info "No old backups to clean up"
    fi
}

# Show backup summary
show_summary() {
    echo ""
    echo "=============================================="
    echo "           BACKUP SUMMARY"
    echo "=============================================="
    echo ""
    echo -e "${BLUE}Backup Name:${NC} $BACKUP_NAME"
    echo -e "${BLUE}Timestamp:${NC} $(date -r "$BACKUP_PATH" '+%Y-%m-%d %H:%M:%S')"
    echo -e "${BLUE}Location:${NC} $BACKUP_PATH"
    echo ""
    echo -e "${BLUE}Contents:${NC}"

    if [[ -d "$BACKUP_PATH/mongodb" ]]; then
        echo "  - MongoDB: $(du -sh "$BACKUP_PATH/mongodb" 2>/dev/null | cut -f1) ($(find "$BACKUP_PATH/mongodb" -type f | wc -l) files)"
    else
        echo "  - MongoDB: skipped"
    fi

    if [[ -d "$BACKUP_PATH/redis" ]]; then
        echo "  - Redis: $(du -sh "$BACKUP_PATH/redis" 2>/dev/null | cut -f1) ($(find "$BACKUP_PATH/redis" -type f | wc -l) files)"
    else
        echo "  - Redis: skipped"
    fi

    local archive_path="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    if [[ -f "$archive_path" ]]; then
        echo ""
        echo -e "${BLUE}Archive:${NC} $archive_path"
        echo -e "${BLUE}Archive Size:${NC} $(du -sh "$archive_path" | cut -f1)"
    fi

    if [[ "$SKIP_S3" != "true" ]]; then
        local s3_path="s3://${S3_BUCKET}/$(date +%Y/%m/%d)/${BACKUP_NAME}.tar.gz"
        echo ""
        echo -e "${BLUE}S3 Location:${NC} $s3_path"
    fi

    echo ""
    echo "=============================================="
}

# Main function
main() {
    echo ""
    echo "=============================================="
    echo "  RTMN BrandPulse - Backup Script"
    echo "=============================================="
    echo ""
    echo "Backup Name: $BACKUP_NAME"
    echo "Backup Directory: $BACKUP_DIR"
    echo "Retention: $RETENTION_DAYS days"
    echo "S3 Bucket: $S3_BUCKET"
    echo "Timestamp: $(date)"
    echo ""

    check_prerequisites

    create_backup_dir

    if [[ "$SKIP_MONGODB" != "true" ]]; then
        backup_mongodb || log_warning "MongoDB backup had issues"
    fi

    if [[ "$SKIP_REDIS" != "true" ]]; then
        backup_redis || log_warning "Redis backup had issues"
    fi

    create_archive

    if [[ "$SKIP_S3" != "true" ]]; then
        upload_to_s3 || log_warning "S3 upload had issues"
    fi

    cleanup_old_backups

    show_summary

    log_success "=============================================="
    log_success "  Backup complete!"
    log_success "=============================================="
    echo ""
    log_info "To restore from this backup:"
    echo "  MongoDB: mongorestore --uri='\$MONGODB_URI' $BACKUP_PATH/mongodb"
    echo "  Redis: redis-cli -h \$REDIS_HOST -p \$REDIS_PORT CONFIG SET dir $BACKUP_PATH/redis"
    echo ""
}

# Run main function
main
