# O*NET Web Services API Integration Summary

## Overview

VA Care 앱에 O*NET Web Services API 통합이 완료되었습니다. 사용자가 커리어 추천 결과에서 각 직업을 클릭하면 O*NET의 실시간 직업 정보를 상세하게 볼 수 있습니다.

## 구현 내용

### 1. Backend API (`/onet-career/overview/{onet_code}`)

**위치:** `explore-yourself (6)/backend/app/apis/onet_career_api/__init__.py`

**기능:**
- O*NET Web Services API와 통합
- HTTP Basic Authentication (Username/Password)
- 직업별 상세 정보 조회
- 에러 핸들링 및 타임아웃 관리

**응답 데이터:**
```json
{
  "code": "17-2071.00",
  "title": "Electrical Engineers",
  "tags": {
    "bright_outlook": true
  },
  "also_called": {
    "title": ["Design Engineer", "Electrical Design Engineer"]
  },
  "what_they_do": "Research, design, develop...",
  "on_the_job": {
    "task": ["Design electrical instruments...", "..."]
  },
  "career_video": false,
  "resources": {
    "resource": [
      {"href": "...", "title": "Knowledge"},
      {"href": "...", "title": "Skills"}
    ]
  }
}
```

### 2. Career Recommendation 업데이트

**위치:** `explore-yourself (6)/backend/app/apis/career_recommendation/__init__.py`

**변경사항:**
- `OccupationMatch` 모델에 `onet_code` 필드 추가
- `get_onet_code_for_title()` 함수로 직업명→O*NET 코드 매핑
- 추천 API 응답에 O*NET 코드 자동 포함

### 3. Frontend - Career Detail 페이지

**위치:** `explore-yourself (6)/frontend/src/pages/CareerDetail.tsx`

**라우트:** `/career/:onetCode`

**표시 정보:**
- ✅ 직업명 및 O*NET 코드
- ✅ Bright Outlook 배지 (성장 전망)
- ✅ 대체 직업명들 (Also Known As)
- ✅ 직업 설명 (What They Do)
- ✅ 주요 업무 내용 (On the Job)
- ✅ 상세 리소스 링크 (Knowledge, Skills, Abilities)
- ✅ My Next Move 전체 프로필 링크

### 4. Frontend - Career Recommendations 컴포넌트 업데이트

**위치:** `explore-yourself (6)/frontend/src/components/CareerRecommendations.tsx`

**변경사항:**
- 각 직업 카드를 클릭 가능하게 수정
- O*NET 코드가 있는 경우 자동으로 상세 페이지로 네비게이션
- Hover 효과 및 ExternalLink 아이콘 추가
- 클릭 시 `/career/{onetCode}`로 이동

### 5. TypeScript 타입 정의

**위치:** `explore-yourself (6)/frontend/src/types.ts`

**추가된 필드:**
```typescript
export interface CareerRecommendationMatch {
  title: string
  onet_code?: string | null  // ← 새로 추가
  correlation?: number | null
  // ...
}
```

### 6. 라우팅 설정

**위치:** `explore-yourself (6)/frontend/src/user-routes.tsx`

**새 라우트:**
```typescript
{ path: "/career/:onetCode", element: <UserGuard><CareerDetail /></UserGuard> }
```

## 환경 변수 설정

### O*NET API Credentials

```bash
ONET_USERNAME=exploreyourself
ONET_PASSWORD=3364miw
```

**설정 위치:**
- ✅ `explore-yourself (6)/backend/.env`
- ✅ `cloudrun.env`
- ✅ `cloudrun.env.yaml`

### 보안

- ✅ 모든 실제 credentials 파일은 `.gitignore`에 포함
- ✅ Git 캐시에서 민감 파일 제거 완료
- ✅ Example 파일만 저장소에 포함

## 사용자 플로우

```
1. 사용자가 테스트 완료
   ↓
2. Results 페이지 → Careers 탭 클릭
   ↓
3. Career Recommendations 자동 분석 실행
   ↓
4. 추천 직업 카드들 표시 (클릭 가능)
   ↓
5. 사용자가 직업 카드 클릭
   ↓
6. /career/{onetCode} 페이지로 이동
   ↓
7. O*NET API 호출하여 실시간 데이터 표시
   ↓
8. 사용자가 상세 정보 확인:
   - 직업 설명
   - 대체 직업명
   - 실제 업무 내용
   - Bright Outlook 여부
   - Knowledge/Skills/Abilities 리소스 링크
```

## 배포 방법

### 자동 배포 (권장)

```bash
# Docker Desktop이 실행 중인지 확인
./deploy.sh
```

### 수동 배포

```bash
# 1. Build
docker build --target production-cloudrun \
  -t us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration .

# 2. Push
docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration

# 3. Deploy
gcloud run deploy vacare-app \
  --image us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration \
  --region us-central1 \
  --platform managed \
  --env-vars-file cloudrun.env.yaml \
  --allow-unauthenticated

# 4. Update latest tag
docker tag us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration \
  us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:latest
docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:latest
```

## 테스트 방법

### 로컬 테스트

```bash
# Backend 실행
cd "explore-yourself (6)/backend"
uv run uvicorn main:app --reload --port 8000

# Frontend 실행
cd "explore-yourself (6)/frontend"
yarn dev

# O*NET API 테스트
curl http://localhost:8000/routes/onet-career/overview/17-2071.00
```

### 프로덕션 테스트

1. 앱 접속
2. 테스트 완료 (Interest/Ability/Knowledge/Skills 중 하나)
3. Results → Careers 탭
4. 추천된 직업 카드 클릭
5. 상세 페이지 확인:
   - O*NET 데이터가 로드되는지
   - Bright Outlook 배지 표시 여부
   - 업무 내용 리스트 확인
   - 리소스 링크 작동 확인

## 제한사항

### Career Video 제외
- O*NET API는 비디오 존재 여부(`career_video: boolean`)만 제공
- 실제 비디오 URL이나 embed 코드는 제공하지 않음
- 대안: My Next Move 외부 링크 제공

### O*NET 코드 매칭
- 일부 직업은 O*NET 데이터베이스에 정확히 일치하지 않을 수 있음
- 코드가 없는 직업 카드는 클릭 불가 (hover 효과 없음)
- 백엔드 로그에서 매칭 실패 확인 가능

### API Rate Limiting
- O*NET API의 rate limit 정책 확인 필요
- 현재는 제한 없이 호출 (향후 캐싱 고려)

## 향후 개선 사항

1. **캐싱 구현**
   - Redis 또는 메모리 캐시로 O*NET API 응답 저장
   - TTL 설정하여 주기적 갱신

2. **Fallback 처리**
   - O*NET API 실패 시 기본 정보 표시
   - 오프라인 모드 지원

3. **검색 기능**
   - 직업명으로 O*NET 코드 검색
   - Fuzzy matching으로 유사 직업 추천

4. **다국어 지원**
   - O*NET API는 영어만 제공
   - 번역 레이어 추가 고려

## 관련 문서

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 배포 가이드
- **[ENV_SETUP.md](./ENV_SETUP.md)** - 환경 변수 설정
- **[CLAUDE.md](./CLAUDE.md)** - 프로젝트 전체 가이드
- **[deploy.sh](./deploy.sh)** - 자동 배포 스크립트

## 참고 자료

- [O*NET Web Services API Reference](https://services.onetcenter.org/reference/)
- [O*NET Career Overview Endpoint](https://services.onetcenter.org/reference/mnm/career#overview)
- [My Next Move](https://www.mynextmove.org/)
- [CareerOneStop](https://www.careeronestop.org/)
