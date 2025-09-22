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

Each assessment module follows the same pattern:
- Questions defined in backend API modules
- Frontend components for question display
- Results calculated server-side
- Progress synced with Firestore

## When Working in This Codebase

1. **Always check existing patterns** in similar components/APIs before implementing
2. **Use existing utilities** - check `utils/` before creating new ones
3. **Follow the router patterns** for new API endpoints
4. **Maintain Firebase patterns** - use transactions for related updates
5. **Test thoroughly** - include loading states, error states, empty states
6. **Check AGENTS.md** for detailed implementation guidelines and architecture decisions

## Linting and Code Quality

- Frontend uses ESLint (run with `yarn lint`)
- TypeScript configuration allows some flexibility but maintain good practices
- Tailwind configuration includes shadcn/ui theme extensions
- Use Biome for additional code formatting if available

See AGENTS.md for comprehensive development guidelines, troubleshooting, and implementation patterns.