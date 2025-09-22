# VA Care — 기술 요구사항 문서 (TRD)

본 문서는 VA Care의 시스템 아키텍처, 인터페이스 계약, 데이터 모델, 성능/보안/운영 요구사항을 정의합니다. AGENTS.md의 코드 스타일·구조·런타임 규칙을 준수합니다.

## 1. 시스템 개요
- 프런트엔드: React 18 + TypeScript + Vite, Tailwind + shadcn/ui, Zustand(persist)
- 백엔드: Python FastAPI, 비동기 엔드포인트, Pydantic 모델 검증
- 인증/데이터: Firebase Auth(ID 토큰), Firestore(assessments 컬렉션)
- 데이터/추천: RIASEC, O*NET 데이터셋, 멀티 카테고리 추천
- 패키지 매니저: yarn(프런트), uv(백엔드)
- MCP: Databutton MCP(질문/데이터 적재·연동)

## 2. 저장소 구조(요약)
- `frontend/`: 앱 소스(`src/app`, `src/brain`, `src/pages`, `src/utils`)
- `backend/`: FastAPI 앱(`app/apis/*` 모듈, `main.py`)
- `Elements_data/`: O*NET 데이터셋
- `docs/`: 본 문서(PRD, TRD)

## 3. 런타임 환경
- Node 18+, Python 3.13+
- 개발: `make install-*`, `make run-*` 각자 실행
- 빌드: `cd frontend && yarn build`, `cd backend && uv build`
- 컨테이너: `docker-compose.dev.yml`(핫리로드), `docker-compose.yml`(prod 포함)

## 4. 인증 및 권한
- 클라이언트: Firebase Auth로 로그인 → ID 토큰 획득 → 모든 API 호출에 `Authorization: Bearer <idToken>` 첨부
- 서버: Firebase Admin으로 토큰 검증 → `user_id` 컨텍스트에 주입 → Firestore 문서 접근 제어
- 보안 규칙: Firestore Security Rules에서 `assessments/{userId}` 문서는 오너만 읽기/쓰기 허용

## 5. 데이터 모델
### 5.1 Firestore 구조
```
assessments/{userId}:
  interest: { answers, results, currentQuestionIndex }
  ability: { answers, results, currentQuestionIndex }
  knowledge: { answers, results }
  skills: { answers, results }
  careerRecommendations: { matches: OccupationMatch[], category: string }
  profile: { name?, birthYear?, school?, grade? }
  lastUpdated: timestamp
```

### 5.2 TypeScript 인터페이스(프런트)
```ts
export type RiasecKey = 'R'|'I'|'A'|'S'|'E'|'C'
export interface InterestAnswers { [questionId: string]: 0|1|2|3|4 }
export interface InterestResults { scores: Record<RiasecKey, number>; top: RiasecKey[]; description: string }
export interface AbilitySubsetResult { key: string; score: number }
export interface KnowledgeSubsetResult { key: string; score: number }
export interface SkillSubsetResult { key: string; score: number }
export interface OccupationMatch { onetCode: string; title: string; score: number; rationale: string[] }
```

### 5.3 Pydantic 모델(백엔드 예시)
```py
class InterestAnswer(BaseModel):
    question_id: str
    value: conint(ge=0, le=4)

class InterestResults(BaseModel):
    scores: Dict[str, float]
    top: List[str]
    description: str

class AnalyzeMultiRequest(BaseModel):
    interest: InterestResults
    ability: List[AbilitySubset]
    knowledge: List[KnowledgeSubset]
    skills: List[SkillSubset]
    k: conint(ge=1, le=20) = 20

class OccupationMatch(BaseModel):
    onet_code: str
    title: str
    score: float
    rationale: List[str]
```

## 6. API 설계
- 패턴: 각 모듈 `app/apis/<module>/__init__.py` 내 `APIRouter` 정의, `@router.post("/endpoint-name")`
- 공통: 요청/응답 모두 Pydantic 모델, 예외는 `HTTPException`으로 처리
- 인증: 기본 인증 필요, 특정 공개 엔드포인트는 화이트리스트로 명시(없으면 전부 인증)

### 6.1 평가 관련
- `POST /routes/assessment_api/get-questions` → 질문 세트 반환
- `POST /routes/assessment_api/calculate-results` → 흥미/능력 점수 계산
- `POST /routes/knowledge_assessment_api/get-questions`
- `POST /routes/skills_assessment_api/get-questions`

요청/응답 구조는 `frontend/src/brain`의 자동 생성 클라이언트 계약을 기준으로 유지(수정 시 `yarn generate-api`).

### 6.2 추천/분석
- `POST /routes/career_recommendation/analyze-multi` → 최대 20개 직업 추천, 근거 포함

### 6.3 사용자 데이터
- `POST /routes/user_data/get` → Firestore `assessments/{userId}` 읽기(교사용 리포트 등)

## 7. 프런트엔드 아키텍처
- 라우팅: `src/pages` 기반, 보호 라우트는 `UserGuard`
- 앱 컨텍스트: `AppProvider`(토스트, 초기 동기화), `AuthProvider`(Auth 상태)
- 상태: `useAssessmentStore`(로컬), `useFirebaseAssessmentStore`(Firestore 동기화)
- API: `src/brain` 자동 생성 클라이언트, `backend` 인스턴스에서 베이스 URL/토큰 주입
- UI: shadcn/ui + Tailwind, 모바일 우선, skeleton/loader/empty/error 상태 표준화

## 8. 백엔드 아키텍처
- `main.py`: 라우터 자동 마운트(`/routes`), CORS, 인증 미들웨어
- 각 모듈: 질문 소스/결과 계산 로직, Pydantic 스키마, 예외 처리
- 추천 모듈: Numpy/Scipy 기반 유사도/가중합 계산, 파라미터화(가중치, 임계값)

## 9. 성능 요구사항
- 초기 로드 번들 ≤ 300KB(gzip), 라우트 분할로 평가 페이지 지연 로드
- API P95: 질문/결과 ≤ 300ms, 분석 ≤ 2s(온-메모리 캐시 가용)
- Firestore 쓰기: 디바운스(≥ 250ms), 배치 쓰기 우선

## 10. 보안/프라이버시
- 입력 검증: 모든 엔드포인트 Pydantic 검증, 범위 외 값 거절
- 인증 강제: 미인증 요청 401, 권한 불일치 403
- 데이터 최소화: 개인식별 최소, 필요시 가명처리
- 로깅: 오류 원인/상태코드/요청 ID, 민감정보 제외
- 데이터 삭제: 사용자 요청 시 `assessments/{userId}` 전부 삭제

## 11. 오류 처리/복원력
- 프런트: 토스트 기반 오류 표준화, 재시도(지수 백오프, 최대 3회)
- 저장: 로컬→원격 동기화 실패 시 큐잉 및 후속 재시도
- 백엔드: 예측 가능한 오류는 4xx, 서버 오류는 5xx + 로그

## 12. 국제화/현지화
- 기본: 한국어 UI/카피, 날짜/숫자 로캘 반영
- 용어: 직무/설명은 한글 표기, O*NET 제목 동시 표기 허용

## 13. 접근성
- 키보드 탐색 가능, 폰트 대비 WCAG AA, 폼 요소 aria 속성
- 스크린리더용 라벨, 에러 메시지 명확성

## 14. 분석/지표(이벤트 제안)
- `auth_login_success`
- `assessment_start`/{type}
- `assessment_complete`/{type, duration}
- `recommendation_viewed`/{count}
- `occupation_open`/{onetCode}
- `exploration_task_saved`

## 15. 테스트 전략
- 프런트: 유닛 테스트(스토어/훅), 컴포넌트 렌더링/상태 전이, 계약 테스트(브레인 클라이언트)
- 백엔드: Pytest로 스키마·라우터 단위 테스트, 추천 로직 수치 테스트
- 커버리지 목표: 프런트/백엔드 라인 커버리지 ≥ 70%

## 16. 배포/운영
- 빌드: `yarn build`, `uv build`
- 컨테이너: Nginx(정적) + Uvicorn(백엔드), Supervisor로 프로세스 관리
- 모니터링: 응답시간/에러율, Firestore 읽기/쓰기 할당량 경보

## 17. 변경/확장 가이드
- 신규 평가 타입 추가:
  1) `backend/app/apis/<name>/` 모듈 생성(질문/계산, 스키마)
  2) 라우터 등록
  3) 프런트 `yarn generate-api`로 계약 갱신
  4) `src/pages`에 화면 추가, Firestore 유틸 확장
  5) Zustand 스토어 타입/액션 보강

## 18. 수용 기준(샘플)
- 로그인 후 30초 내 첫 질문 화면 렌더
- 흥미 평가 60문항 평균 10분 내 완료(3–5문항 배치)
- 중단 후 재접속 시 마지막 위치에서 재개
- 추천 화면에서 상위 10개 직무와 근거 리스트 노출

## 19. 리스크/완화
- 모바일 네트워크 불안정 → 요청 재시도, 질문 캐시, 저장 디바운스
- 데이터셋 버전 상이 → 데이터 버전 태깅, 마이그레이션 스크립트
- 모델 설명 가능성 → 근거(rationale) 생성/노출 일관화

## 20. 오픈 이슈/추가 작업
- 교사용 리포트 접근 제어 모델(역할/그룹) 정의
- 익명 사용 모드(사전 체험) 범위 결정
- 추천 로직 파라미터(가중치/임계값) 운영 UI 범위 확정

