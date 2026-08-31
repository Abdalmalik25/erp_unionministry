# CI/CD Pipeline Documentation

This document describes the complete CI/CD pipeline for the Yemen National Labor Platform.

## Table of Contents

- [Overview](#overview)
- [Pipeline Architecture](#pipeline-architecture)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Docker Setup](#docker-setup)
- [Deployment Process](#deployment-process)
- [Environment Configuration](#environment-configuration)
- [Monitoring & Rollback](#monitoring--rollback)

## Overview

The platform uses GitHub Actions for CI/CD with the following stages:

1. **Continuous Integration** — Automated testing on every push
2. **Build** — Docker image creation and artifact generation
3. **Deploy to Staging** — Automatic deployment on main branch
4. **Deploy to Production** — Manual trigger with approval
5. **Mobile Build** — APK/IPA generation for inspector app
6. **Security Scanning** — Vulnerability detection

## Pipeline Architecture

```
┌──────────────┐
│   Git Push   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│   Lint & Test    │  (parallel)
│   - ESLint       │
│   - TypeScript   │
│   - Python       │
│   - Go           │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Build Docker    │  (if main)
│  Build Frontend  │
│  Build SDKs      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Deploy Staging   │  (auto)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Deploy Prod      │  (manual)
│  + Approval      │
└──────────────────┘
```

## GitHub Actions Workflows

### 1. CI Pipeline ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml))

Triggered on every push and PR to main/develop.

**Jobs:**

| Job | Description | Duration |
|-----|-------------|----------|
| `lint` | ESLint + TypeScript checks | ~2 min |
| `backend-test` | API tests with PostgreSQL | ~3 min |
| `frontend-test` | Frontend build verification | ~4 min |
| `typescript-sdk-test` | TypeScript SDK type check | ~1 min |
| `python-sdk-test` | Python SDK installation | ~1 min |
| `go-sdk-test` | Go SDK tests | ~1 min |
| `build-docker` | Docker image build (main only) | ~5 min |
| `security` | Security scanning | ~2 min |

### 2. Deploy Pipeline ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml))

Triggered manually via workflow_dispatch.

**Features:**

- **Environment selection** (staging/production)
- **Pre-deployment checks** (branch validation)
- **Backup creation** before production deploy
- **Health check verification** post-deploy
- **Slack notifications**
- **Automatic rollback** capability

### 3. Mobile Pipeline ([`.github/workflows/mobile.yml`](../.github/workflows/mobile.yml))

Triggered on changes to `mobile/` directory.

**Jobs:**

| Job | OS | Description |
|-----|-----|-------------|
| `lint` | Ubuntu | TypeScript + ESLint |
| `android-build` | Ubuntu | Debug APK build |
| `ios-build` | macOS | Debug iOS build |
| `tests` | Ubuntu | Jest unit tests |
| `e2e-tests` | Ubuntu | Detox E2E tests |
| `android-release` | Ubuntu | Signed AAB for Play Store |
| `ios-release` | macOS | TestFlight distribution |

## Docker Setup

### Dockerfile

Multi-stage build for production:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
EXPOSE 3000
USER nodejs
CMD ["node", "server/index.js"]
```

### Docker Compose

Services included:

- **app** — Main application
- **db** — PostgreSQL 16
- **redis** — Cache and sessions
- **nginx** — Reverse proxy with SSL

## Deployment Process

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/mol-yemen/national-labor-platform.git
cd national-labor-platform

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Deploy
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh production
```

### Step-by-Step

1. **SSH into server:**
   ```bash
   ssh user@your-server
   ```

2. **Navigate to deployment directory:**
   ```bash
   cd /opt/nlp
   ```

3. **Pull latest code:**
   ```bash
   git pull origin main
   ```

4. **Run deployment:**
   ```bash
   sudo ./scripts/deploy.sh production
   ```

The script will:

- ✅ Check prerequisites
- ✅ Create backup of current deployment
- ✅ Pull latest code
- ✅ Build Docker images
- ✅ Stop existing services
- ✅ Start new services
- ✅ Run database migrations
- ✅ Verify health check
- ✅ Clean up old images

## Environment Configuration

### Required Environment Variables

Create `.env` file in deployment directory:

```bash
# Database
DB_USER=nlp
DB_PASSWORD=strong-random-password
DB_NAME=nlp_production
DATABASE_URL=postgresql://nlp:password@db:5432/nlp_production

# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=your-jwt-secret-min-32-chars
API_KEY=your-api-key

# Redis
REDIS_URL=redis://redis:6379

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yemen.gov.ye
SMTP_PASSWORD=app-specific-password

# Storage (optional)
S3_BUCKET=nlp-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info

# CI/CD
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Monitoring & Rollback

### Health Checks

Automated health checks run every 30 seconds:

```bash
# Manual health check
./scripts/deploy.sh health

# Or directly
curl http://localhost:3000/health
```

### Logs

```bash
# View application logs
docker logs nlp-app -f

# View all services
docker-compose logs -f

# View specific service
docker logs nlp-db -f
```

### Backup Management

```bash
# List backups
ls -lh /opt/nlp/backups/

# Manual backup
./scripts/monitor.sh

# Restore database
./scripts/restore.sh db /opt/nlp/backups/db-20260101-120000.sql.gz

# Restore uploads
./scripts/restore.sh uploads /opt/nlp/backups/uploads-20260101-120000.tar.gz
```

### Rollback

If a deployment fails, rollback to the previous version:

```bash
# Automatic rollback (via CI)
gh workflow run deploy.yml -f environment=rollback

# Manual rollback
sudo ./scripts/deploy.sh rollback
```

### Monitoring Stack (Recommended)

For production, consider integrating:

- **Prometheus** — Metrics collection
- **Grafana** — Visualization dashboards
- **Sentry** — Error tracking
- **ELK Stack** — Log aggregation
- **Uptime monitoring** — Status page

## Security Considerations

### Secrets Management

- Use GitHub Secrets for CI/CD credentials
- Use environment variables for runtime configuration
- Never commit secrets to repository
- Rotate secrets regularly (every 90 days)

### SSL/TLS

- Use Let's Encrypt for free SSL certificates
- Enable HSTS for secure connections
- Configure strong cipher suites
- Enable OCSP stapling

### Firewall

```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### Database Security

- Use strong passwords (32+ characters)
- Enable SSL connections
- Regular security updates
- Restrict network access
- Enable audit logging

## Performance Optimization

### Build Optimization

- Use multi-stage Docker builds
- Cache layers effectively
- Minimize image size
- Use production dependencies only

### Runtime Optimization

- Enable gzip compression (Nginx)
- Use HTTP/2
- Implement caching strategies
- Use CDN for static assets
- Enable browser caching

## Support

- **Email**: devops@yourplatform.ye
- **Documentation**: https://docs.yourplatform.ye
- **Status Page**: https://status.yourplatform.ye
- **Slack**: #platform-ops
