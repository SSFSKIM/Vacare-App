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

# Copy package files for Yarn PnP
COPY ["explore-yourself (6)/frontend/package.json", "explore-yourself (6)/frontend/yarn.lock", "explore-yourself (6)/frontend/.pnp.cjs", "explore-yourself (6)/frontend/.pnp.loader.mjs", "./"]
COPY ["explore-yourself (6)/frontend/.yarn/", "/app/frontend/.yarn/"]
RUN corepack enable && corepack prepare yarn@4.0.2 --activate && yarn install

# Copy frontend source
COPY ["explore-yourself (6)/frontend/", "./"]
RUN yarn build

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
    && ln -s /usr/bin/python3 /usr/bin/python \
    && ln -s /usr/bin/pip3 /usr/bin/pip

WORKDIR /app/backend

# Install Python dependencies
COPY ["explore-yourself (6)/backend/requirements.txt", "./"]
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY ["explore-yourself (6)/backend/", "./"]

# Final production stage
FROM ubuntu:22.04 AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && ln -s /usr/bin/pip3 /usr/bin/pip

WORKDIR /app

# Copy Python dependencies from backend-base
COPY --from=backend-base /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=backend-base /usr/local/bin /usr/local/bin

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy backend source
COPY --from=backend-base /app/backend /app/backend

# Nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Environment variables
ENV PYTHONPATH=/app/backend
ENV NODE_ENV=production

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]