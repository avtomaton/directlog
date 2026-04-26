# =============================================================================
# Multi-stage Dockerfile for DirectLog
# Stage 1: Build frontend
# Stage 2: Production image with backend + built frontend
# =============================================================================

# --- Stage 1: Build frontend ---
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production ---
FROM python:3.12-slim

LABEL maintainer="DirectLog"
LABEL description="Pilot logbook application"

# Install system deps for potential PostgreSQL support + curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt gunicorn==21.2.0 psycopg2-binary==2.9.9

# Copy backend code
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./static/

# Create data directory
RUN mkdir -p /app/data

# Non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 5001

# Healthcheck endpoint - use GET on a public endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5001/ || exit 1

# Gunicorn for production — override WORKERS via env
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5001} --workers ${WORKERS:-4} --timeout 120 app:app"]
