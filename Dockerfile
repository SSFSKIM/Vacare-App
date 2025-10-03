# Multi-stage build similar to Databutton's setup
FROM ubuntu:22.04 AS frontend-builder

WORKDIR /app/frontend

# Install Node.js and Yarn
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && rm -rf /var/lib/apt/lists/*

# Copy all frontend files at once (includes Yarn PnP files)
COPY ["explore-yourself (6)/frontend/", "./"]
RUN corepack enable && yarn install --immutable && yarn build

# Python backend stage
FROM ubuntu:22.04 AS backend-base

# Install system dependencies and Python
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip

WORKDIR /app/backend

# Install Python dependencies
COPY ["explore-yourself (6)/backend/requirements.txt", "./"]
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source (ensure all files including routers.json are included)
COPY ["explore-yourself (6)/backend/", "./"]

# Copy DataStorage files for local data access
COPY ["explore-yourself (6)/DataStorage/", "./DataStorage/"]

# Cloud Run optimized production stage (no nginx/supervisor)
FROM ubuntu:22.04 AS production-cloudrun

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip

WORKDIR /app

# Copy Python dependencies from backend-base
COPY --from=backend-base /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=backend-base /usr/local/bin /usr/local/bin

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy backend source
COPY --from=backend-base /app/backend /app/backend

# Environment variables
ENV PYTHONPATH=/app/backend
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run will provide env vars at runtime, no need to copy .env file
WORKDIR /app/backend

EXPOSE 8080

# Run uvicorn directly - Cloud Run uses PORT env var
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --log-level info

# Final production stage (with nginx/supervisor for local Docker)
FROM ubuntu:22.04 AS production

# Install runtime dependencies (including gettext-base for envsubst)
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    python3 \
    python3-pip \
    gettext-base \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip

WORKDIR /app

# Copy Python dependencies from backend-base
COPY --from=backend-base /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=backend-base /usr/local/bin /usr/local/bin

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy backend source (includes DataStorage from backend-base)
COPY --from=backend-base /app/backend /app/backend

# Nginx configuration template
COPY docker/nginx.conf /etc/nginx/nginx.conf.template

# Supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# FastAPI startup script
COPY docker/start-fastapi.sh /app/start-fastapi.sh
RUN chmod +x /app/start-fastapi.sh

# Environment variables
ENV PYTHONPATH=/app/backend
ENV NODE_ENV=production
ENV PORT=8080

# Copy environment file if exists (for Cloud Run)
COPY cloudrun.env /app/.env

EXPOSE 8080

# Load environment variables and start services
CMD set -a && . /app/.env && set +a && \
    envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && \
    /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

# -----------------------------
# Development targets
# -----------------------------

# Frontend development stage (vite dev server)
FROM node:18-bullseye AS frontend-dev
WORKDIR /app/frontend
# Enable corepack/yarn and install deps at build time for faster startup.
RUN corepack enable
COPY ["explore-yourself (6)/frontend/package.json", "explore-yourself (6)/frontend/yarn.lock", "./"]
RUN yarn install
# Source is volume-mounted in compose; default command runs dev server.
EXPOSE 3000
CMD ["bash", "-lc", "corepack enable && yarn install --silent || true && yarn dev --host 0.0.0.0 --port 3000"]

# Backend development stage (uvicorn reload)
FROM python:3.10-slim AS backend-dev
WORKDIR /app/backend
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY ["explore-yourself (6)/backend/requirements.txt", "./requirements.txt"]
RUN pip install --no-cache-dir -r requirements.txt
# Source is volume-mounted in compose; default command runs uvicorn with reload.
EXPOSE 8000
CMD ["bash", "-lc", "pip install -r requirements.txt || true && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"]

# Combined development stage (frontend + backend in one container)
FROM python:3.10-slim AS development
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends curl gnupg build-essential && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get update && apt-get install -y --no-install-recommends nodejs git && rm -rf /var/lib/apt/lists/* \
    && npm install -g yarn
# Prepare backend deps globally
COPY ["explore-yourself (6)/backend/requirements.txt", "/app/backend/requirements.txt"]
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
# Prepare frontend deps
WORKDIR /app/frontend
RUN corepack enable || true
COPY ["explore-yourself (6)/frontend/package.json", "explore-yourself (6)/frontend/yarn.lock", "/app/frontend/"]
RUN yarn install
# Ports: 3000 (frontend), 8000 (backend)
EXPOSE 3000 8000
# Volumes will mount ./frontend to /app/frontend and ./backend to /app/backend in compose.dev
# Start both dev servers; backend in background, frontend in foreground
CMD ["bash", "-lc", "(cd /app/backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload) & (cd /app/frontend && yarn install --silent || true && yarn dev --host 0.0.0.0 --port 3000)"]
