# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VA Care is a comprehensive career aptitude assessment platform built with React + TypeScript frontend and Python FastAPI backend. The application uses the RIASEC methodology and O*NET data to provide personalized career recommendations through systematic evaluation of interests, abilities, knowledge, and skills.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Python FastAPI
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **State Management**: Zustand with persistence
- **Package Managers**: yarn (frontend), uv (backend)

## Common Commands

### Development Setup
```bash
# Install all dependencies
make install

# Install separately
make install-backend    # cd backend && uv install
make install-frontend   # cd frontend && corepack enable && yarn install
```

### Development
```bash
# Start backend (port 8000)
make run-backend        # cd backend && uv run uvicorn main:app --reload --port 8000

# Start frontend (port 5173)
make run-frontend       # cd frontend && yarn dev

# Docker development
make dev               # docker-compose -f docker-compose.dev.yml up --build
```

### Build & Test
```bash
# Frontend build
cd frontend && yarn build

# Frontend linting
cd frontend && yarn lint

# Backend testing
cd backend && uv run pytest
```

### Production Deployment to Google Cloud Run

**Prerequisites:**
- Docker Desktop running
- Google Cloud SDK (`gcloud`) authenticated
- Environment variables configured in `cloudrun.env.yaml`

**Quick Deploy (Automated):**
```bash
./deploy.sh [image-tag]
# Default tag: onet-integration
# Example: ./deploy.sh v1.2.3
```

**Manual Deployment Steps:**

```bash
# 1. Build Docker image (takes ~4-5 minutes)
docker build --target production-cloudrun \
  -t us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration .

# 2. Push to Artifact Registry (takes ~30 seconds)
docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration

# 3. Deploy to Cloud Run (takes ~2 minutes)
gcloud run deploy vacare-app \
  --image us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration \
  --region us-central1 \
  --platform managed \
  --env-vars-file cloudrun.env.yaml \
  --allow-unauthenticated

# 4. Update 'latest' tag
docker tag us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration \
  us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:latest
docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:latest
```

**Verify Deployment:**
```bash
# Get service URL
gcloud run services describe vacare-app --region=us-central1 --format='value(status.url)'

# Check logs
gcloud run services logs read vacare-app --region=us-central1 --limit=20

# Verify environment variables
gcloud run services describe vacare-app --region=us-central1 \
  --format='value(spec.template.spec.containers[0].env)' | grep ONET
```

**Service Details:**
- **Project**: vacare-1abb5
- **Region**: us-central1
- **Service Name**: vacare-app
- **Repository**: va-care
- **Service URL**: https://vacare-app-881187333959.us-central1.run.app

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## Project Structure

**Main Directory**: `explore-yourself (6)/` contains the actual application code.

```
explore-yourself (6)/
├── frontend/
│   ├── src/
│   │   ├── app/           # Core app exports and auth
│   │   ├── brain/         # Auto-generated API client (DO NOT EDIT)
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── utils/         # Utilities (Firebase, stores)
│   │   └── constants.ts   # App configuration
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   └── apis/          # API endpoints
│   │       ├── assessment_api/
│   │       ├── knowledge_assessment_api/
│   │       ├── skills_assessment_api/
│   │       ├── analyze_results/
│   │       ├── career_recommendation/
│   │       ├── career_reports/
│   │       ├── onet_career_api/      # O*NET Web Services integration
│   │       └── user_data/
│   ├── main.py           # FastAPI app entry
│   └── pyproject.toml
└── Makefile
```

## Architecture Patterns

### Frontend Architecture
- **Strict TypeScript**: `strict: false` in tsconfig but use proper typing
- **Path Aliases**: Use `@/` for src, `brain` for API client, `utils/*` for utilities
- **State Management**: Zustand stores with persistence
- **Styling**: Tailwind CSS with shadcn/ui components only
- **API Client**: Auto-generated in `brain/` directory - never edit manually

### Backend Architecture
- **FastAPI Routers**: Each API module in `app/apis/<module>/`
- **Dynamic Loading**: Routes auto-discovered from `apis/*/__init__.py`
- **Authentication**: Firebase Auth integration with middleware
- **Request/Response**: Pydantic models for validation

### Key Files
- `frontend/vite.config.ts`: Vite configuration with proxy setup for `/routes`
- `backend/main.py`: FastAPI app factory with dynamic router loading
- `frontend/src/brain/`: Auto-generated API client (excluded from TypeScript compilation)

## Development Guidelines

### Frontend Conventions
- **Components**: Functional components with hooks only
- **File Naming**: PascalCase for components, kebab-case for utilities
- **Imports**: Use path aliases (`@/`, `components/`, `utils/`)
- **No semicolons**, single quotes for strings
- **Tailwind Only**: No custom CSS files, use Tailwind utility classes

### Backend Conventions
- **Type Hints**: Required for all function parameters and returns
- **Async/Await**: Use for all endpoint handlers
- **Pydantic Models**: For request/response validation
- **Router Pattern**: One router per API module

### Authentication Flow
1. Firebase Auth handles user authentication
2. Auth tokens attached to API requests via middleware
3. User ID extracted from token for Firestore operations
4. Router-level auth can be disabled via `routers.json` config

## Important Notes

### Auto-Generated Files
Never edit these files manually:
- `frontend/src/brain/Brain.ts`
- `frontend/src/brain/data-contracts.ts`
- `frontend/src/brain/http-client.ts`
- `frontend/src/brain/BrainRoute.ts`

### Environment Configuration
- **Frontend**: Uses Databutton extensions via `DATABUTTON_EXTENSIONS` env var
- **Backend**: Firebase service account key for admin operations
- **Proxy**: Vite proxies `/routes` to backend on port 8000
- **O*NET API**: Requires `ONET_USERNAME` and `ONET_PASSWORD` environment variables
  - Production credentials in `cloudrun.env.yaml`
  - See [ENV_SETUP.md](./ENV_SETUP.md) for configuration details

### Testing Approach
- **Frontend**: Tests available via `yarn test`
- **Backend**: Use `uv run pytest` for testing
- **No specific test framework assumptions** - check existing test files

### Common Pitfalls
- Frontend uses yarn with PnP (Plug'n'Play) - use `corepack enable`
- Backend requires Python 3.13+ and uv package manager
- TypeScript strict mode is disabled but maintain proper typing
- API routes are prefixed with `/routes` due to Databutton architecture

## Firebase Integration

### Firestore Structure
```
assessments/{userId}/
  - interest: { answers, results, currentQuestionIndex }
  - ability: { answers, results, currentQuestionIndex }
  - knowledge: { answers, results }
  - skills: { answers, results }
  - careerRecommendations: { matches, category }
```

### State Management
- Local state via Zustand with localStorage persistence
- Firestore sync handled in utility functions
- Assessment progress auto-saved to both local and remote storage

## Assessment Architecture

The application implements a multi-phase career assessment:

1. **Interest Assessment**: 60 RIASEC questions → 6 category scores
2. **Ability Assessment**: 4 subsets × ~13 questions → ability scores
3. **Knowledge Assessment**: 10 subsets × ~3 questions → knowledge areas
4. **Skills Assessment**: 7 subsets × varying questions → skill proficiencies
5. **Career Recommendation**: Aggregates all scores → O*NET occupation matches
6. **Career Details**: O*NET Web Services API integration for real-time occupation data

Each assessment module follows the same pattern:
- Questions defined in backend API modules
- Frontend components for question display
- Results calculated server-side
- Progress synced with Firestore

### O*NET Integration

The app integrates with O*NET Web Services API to provide detailed career information:

**Backend Endpoint**: `/routes/onet-career/overview/{onet_code}`
- Fetches real-time occupation data from O*NET
- Returns job descriptions, tasks, alternative titles, and growth outlook
- Requires authentication (UserGuard protected)

**Frontend Components**:
- **Career Detail Page**: `/career/:onetCode` - Full occupation details
- **Clickable Career Cards**: In Results → Careers tab
- Auto-links when O*NET code is available in recommendations

**Data Flow**:
1. Career recommendation includes `onet_code` field
2. User clicks career card → navigates to `/career/{code}`
3. Frontend fetches from `/routes/onet-career/overview/{code}`
4. Displays: job description, tasks, bright outlook, knowledge/skills/abilities links

See [ONET_INTEGRATION_SUMMARY.md](./ONET_INTEGRATION_SUMMARY.md) for complete details.

## When Working in This Codebase

1. **Always check existing patterns** in similar components/APIs before implementing
2. **Use existing utilities** - check `utils/` before creating new ones
3. **Follow the router patterns** for new API endpoints
4. **Maintain Firebase patterns** - use transactions for related updates
5. **Test thoroughly** - include loading states, error states, empty states
6. **Check AGENTS.md** for detailed implementation guidelines and architecture decisions

## Deployment Best Practices

When deploying changes to production:

1. **Test locally first**: Run both frontend and backend locally
2. **Check environment variables**: Ensure `cloudrun.env.yaml` is up to date
3. **Use deployment script**: `./deploy.sh` handles all steps automatically
4. **Monitor logs**: Check Cloud Run logs after deployment
5. **Verify endpoints**: Test new API endpoints in production
6. **Update documentation**: Keep CLAUDE.md and other docs current

**Common deployment issues:**
- Docker not running → Start Docker Desktop
- Build fails → Clear Docker cache: `docker builder prune`
- Env vars missing → Check `cloudrun.env.yaml` exists and is complete
- Authentication errors → Verify Firebase service account key is valid

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide.

## Linting and Code Quality

- Frontend uses ESLint (run with `yarn lint`)
- TypeScript configuration allows some flexibility but maintain good practices
- Tailwind configuration includes shadcn/ui theme extensions
- Use Biome for additional code formatting if available

## Additional Documentation

- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment variable configuration
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[ONET_INTEGRATION_SUMMARY.md](./ONET_INTEGRATION_SUMMARY.md)** - O*NET API integration details
- **[deploy.sh](./deploy.sh)** - Automated deployment script

See AGENTS.md for comprehensive development guidelines, troubleshooting, and implementation patterns.