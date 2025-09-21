.PHONY: install install-backend install-frontend run-backend run-frontend build clean

# Default target - install all dependencies
install: install-backend install-frontend

# Install backend dependencies using uv
install-backend:
	cd backend && uv install

# Install frontend dependencies using yarn
install-frontend:
	cd frontend && corepack enable && yarn install

# Run backend server
run-backend:
	cd backend && uv run uvicorn main:app --reload --port 8000

# Run frontend development server
run-frontend:
	cd frontend && yarn dev

# Build frontend for production
build:
	cd frontend && yarn build

# Clean build artifacts and dependencies
clean:
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/.venv
	rm -rf backend/__pycache__

# Development environment with Docker
dev:
	docker-compose -f docker-compose.dev.yml up --build

# Production environment with Docker
prod:
	docker-compose up --build

# Stop Docker containers
down:
	docker-compose down

# View Docker logs
logs:
	docker-compose logs -f