# ============================================
# UnionSphere Enterprise — Production Dockerfile
# Multi-stage build for minimal attack surface
# ============================================

# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false
COPY . .
RUN pnpm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S unionsphere && \
    adduser -S unionsphere -u 1001 -G unionsphere

# Copy only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate
RUN pnpm install --frozen-lockfile --prod=true

# Copy server code and built frontend
COPY server/ ./server/
COPY --from=builder /app/dist ./dist/

# Create data directory for offline SQLite
RUN mkdir -p /app/data && chown -R unionsphere:unionsphere /app

# Security: read-only filesystem except data
USER unionsphere

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_SSL=true
ENV ENABLE_AUTH=true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server/index.js"]
