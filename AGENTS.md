# AGENTS.md

## Project Overview

VA Care is a comprehensive career aptitude assessment platform that helps users discover their ideal career paths through systematic evaluation of interests, abilities, knowledge, and skills. The app uses RIASEC methodology and O*NET data to provide personalized career recommendations.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Backend**: Python FastAPI
- **Authentication**: Firebase Auth (Google & Email)
- **Database**: Firebase Firestore
- **State Management**: Zustand with persistence
- **Package Managers**: yarn (frontend), uv (backend)
- **MCP Extensions**: Databutton MCP for API integration

## Setup Commands

### Installation
```bash
# Install all dependencies
make

# Or install separately
make install-backend   # Backend: uv install
make install-frontend  # Frontend: yarn install
```

### Development
```bash
# Start both servers (separate terminals)
make run-backend      # Runs on http://localhost:8000
make run-frontend     # Runs on http://localhost:5173

# Or run individually
cd backend && uv run uvicorn main:app --reload --port 8000
cd frontend && yarn dev
```

### Build & Deploy
```bash
# Frontend build
cd frontend && yarn build

# Backend deployment
cd backend && uv build
```

## Project Structure

```
/
├── frontend/
│   ├── src/
│   │   ├── app/           # Core app exports and auth
│   │   ├── brain/         # API client and data contracts
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
│   │       ├── ability_assessment/
│   │       ├── knowledge_assessment_api/
│   │       ├── skills_assessment_api/
│   │       ├── analyze_results/
│   │       ├── career_recommendation/
│   │       └── user_data/
│   ├── main.py           # FastAPI app entry
│   └── pyproject.toml
└── Makefile
```

## Code Style & Conventions

### TypeScript/React (Frontend)
- **Strict Mode**: TypeScript strict mode enabled
- **Components**: Functional components with hooks only
- **Styling**: Tailwind utility classes (core utilities only, no custom compilation)
- **State**: Zustand stores with TypeScript interfaces
- **Imports**: Absolute imports using `@/` for src directory
- **File Naming**: PascalCase for components, kebab-case for utilities
- **No semicolons**, single quotes for strings

### Python (Backend)
- **Type Hints**: Use type hints for all function parameters and returns
- **Docstrings**: Google-style docstrings for all API endpoints
- **Models**: Pydantic models for request/response validation
- **Async**: Use async/await for all endpoint handlers
- **Error Handling**: HTTPException with proper status codes
- **File Structure**: One router per API module in `app/apis/`

## API Architecture

### Endpoints Pattern
```python
# backend/app/apis/<module_name>/__init__.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class RequestModel(BaseModel):
    # Define request structure

class ResponseModel(BaseModel):
    # Define response structure

@router.post("/endpoint-name", response_model=ResponseModel)
async def endpoint_name(data: RequestModel):
    # Implementation
```

### Frontend API Client
```typescript
// Auto-generated in brain/Brain.ts
// Do not modify manually - use data contracts
import { backend } from "app";
const response = await backend.endpoint_name(data);
```

## Firebase Integration

### Firestore Structure
```
assessments/
  {userId}/
    - interest: { answers, results, currentQuestionIndex }
    - ability: { answers, results, currentQuestionIndex }
    - knowledge: { answers, results }
    - skills: { answers, results }
    - careerRecommendations: { matches, category }
    - lastUpdated: timestamp
```

### Authentication Flow
1. User signs in via Firebase Auth (Google/Email)
2. Auth token attached to API requests via middleware
3. User ID extracted from token for Firestore operations

## State Management

### Zustand Stores
- `useAssessmentStore`: Local assessment state with persistence
- `useFirebaseAssessmentStore`: Syncs with Firestore
- Store updates trigger Firestore writes automatically

## Testing Approach

### Frontend Testing
```bash
yarn test          # Run all tests
yarn test:watch    # Watch mode
yarn test:coverage # Coverage report
```

### Backend Testing
```bash
cd backend && uv run pytest
uv run pytest --cov  # With coverage
```

## Key Features Implementation

### Assessment Flow
1. **Interest Assessment**: 60 RIASEC questions → 6 category scores
2. **Ability Assessment**: 4 subsets × ~13 questions → ability scores
3. **Knowledge Assessment**: 10 subsets × ~3 questions → knowledge areas
4. **Skills Assessment**: 7 subsets × varying questions → skill proficiencies
5. **Career Recommendation**: Aggregates all scores → O*NET occupation matches

### Data Processing
- Answers stored locally (Zustand) and remotely (Firestore)
- Results calculated server-side via FastAPI endpoints
- Career matches use correlation algorithms with O*NET database

## Environment Variables

### Frontend (.env)
```env
DATABUTTON_PROJECT_ID=<project-id>
DATABUTTON_EXTENSIONS=[{...}]  # Firebase config included
```

### Backend (secrets)
```
FIREBASE_SERVICE_ACCOUNT_KEY  # JSON string for Firebase Admin SDK
```

## Common Tasks

### Adding New Assessment Type
1. Create API module in `backend/app/apis/<name>/`
2. Define Pydantic models for questions/answers
3. Add router with endpoints (get_questions, calculate_results)
4. Update frontend data contracts: `yarn generate-api`
5. Create React components in `frontend/src/pages/`
6. Add Firestore integration in `utils/firestore.ts`
7. Update Zustand store if needed

### Modifying Question Sets
- Questions defined in backend API modules
- Update the question arrays in `__init__.py`
- Results calculation logic in same file

### Updating UI Components
- Use shadcn/ui components from `@/components/ui/`
- Maintain consistent Tailwind classes
- Follow existing component patterns (NavigationBar, Cards)

## Deployment Considerations

### Performance
- Lazy load assessment pages with React.lazy()
- Use Firestore batch writes for multiple updates
- Implement debouncing for answer saves
- Cache question sets in frontend

### Security
- Validate all inputs with Pydantic
- Use Firebase Security Rules for Firestore
- Implement rate limiting on API endpoints
- Sanitize user inputs before storage

### Monitoring
- Log errors to console with context
- Track assessment completion rates
- Monitor API response times
- Set up Firestore usage alerts

## Troubleshooting

### Common Issues
1. **CORS errors**: Check Vite proxy config for `/routes`
2. **Firebase auth fails**: Verify Firebase config in extensions
3. **API 500 errors**: Check Pydantic model validation
4. **State sync issues**: Clear localStorage and Firestore cache
5. **Build failures**: Ensure Node 18+ and Python 3.13+

### Debug Commands
```bash
# Check backend logs
cd backend && uv run uvicorn main:app --reload --log-level debug

# Frontend with verbose logging
cd frontend && VITE_LOG_LEVEL=debug yarn dev

# Clear all caches
rm -rf frontend/node_modules/.vite
rm -rf backend/__pycache__
```

## Agent-Specific Guidelines

### When implementing new features:
1. **Always check existing patterns** in similar components/APIs
2. **Maintain type safety** - no `any` types unless absolutely necessary
3. **Use existing utilities** - check `utils/` before creating new ones
4. **Follow Firebase patterns** - use transactions for related updates
5. **Test edge cases** - empty states, loading states, error states
6. **Document complex logic** with inline comments
7. **Keep components focused** - extract logic to hooks/utilities

### Code Quality Checklist:
- [ ] TypeScript types defined for all props/state
- [ ] Error boundaries around risky components
- [ ] Loading states for async operations
- [ ] Proper error messages for users
- [ ] Accessibility attributes (aria-labels, roles)
- [ ] Mobile-responsive design
- [ ] Performance: memoization where needed
- [ ] Security: input validation on both ends

### Do NOT:
- Modify auto-generated files (`brain/Brain.ts`, `data-contracts.ts`)
- Use localStorage directly (use Zustand stores)
- Make direct Firestore calls from components (use utilities)
- Create new CSS files (use Tailwind only)
- Add external dependencies without checking existing ones
- Use class components (functional only)
- Ignore TypeScript errors (fix them properly)

## Contact & Resources

- **O*NET Database**: https://www.onetcenter.org/database.html
- **RIASEC Model**: Holland Codes career assessment framework
- **Firebase Docs**: https://firebase.google.com/docs
- **Databutton Docs**: https://docs.databutton.com
- **FastAPI Docs**: https://fastapi.tiangolo.com

## Product & Technical Docs

- PRD: [docs/PRD.md](explore-yourself%20(6)/docs/PRD.md)
- TRD: [docs/TRD.md](explore-yourself%20(6)/docs/TRD.md)
