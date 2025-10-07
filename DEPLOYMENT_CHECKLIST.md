# 배포 체크리스트 - O*NET Integration

## 배포 전 확인사항

### 1. Docker 상태 확인
```bash
docker info
```
✅ Docker Desktop이 실행 중이어야 합니다.

### 2. 환경 변수 파일 확인
```bash
cat cloudrun.env.yaml | grep ONET
```
예상 출력:
```yaml
ONET_USERNAME: "exploreyourself"
ONET_PASSWORD: "3364miw"
```

### 3. Google Cloud 인증 확인
```bash
gcloud auth list
gcloud config get-value project
```
예상 출력: `vacare-1abb5`

### 4. 변경사항 확인
```bash
git status
```
주요 변경 파일:
- ✅ `explore-yourself (6)/backend/app/apis/onet_career_api/__init__.py` (신규)
- ✅ `explore-yourself (6)/backend/app/apis/career_recommendation/__init__.py` (수정)
- ✅ `explore-yourself (6)/frontend/src/pages/CareerDetail.tsx` (신규)
- ✅ `explore-yourself (6)/frontend/src/components/CareerRecommendations.tsx` (수정)
- ✅ `explore-yourself (6)/frontend/src/types.ts` (수정)
- ✅ `explore-yourself (6)/frontend/src/user-routes.tsx` (수정)

## 배포 실행

### 옵션 1: 자동 배포 스크립트 사용 (권장)

```bash
./deploy.sh
```

### 옵션 2: 수동 단계별 실행

#### Step 1: Docker Build (~5-10분)
```bash
docker build --target production-cloudrun \
  -t us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration .
```

#### Step 2: Push to Registry (~2-5분)
```bash
docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration
```

#### Step 3: Deploy to Cloud Run (~2-3분)
```bash
gcloud run deploy vacare-app \
  --image us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration \
  --region us-central1 \
  --platform managed \
  --env-vars-file cloudrun.env.yaml \
  --allow-unauthenticated
```

#### Step 4: Update Latest Tag (~1분)
```bash
docker tag us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration \
  us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:latest

docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:latest
```

## 배포 후 테스트

### 1. 서비스 URL 확인
```bash
gcloud run services describe vacare-app --region=us-central1 --format='value(status.url)'
```

### 2. Health Check
```bash
SERVICE_URL=$(gcloud run services describe vacare-app --region=us-central1 --format='value(status.url)')
curl -I "$SERVICE_URL"
```
예상: `HTTP/2 200`

### 3. O*NET API 엔드포인트 테스트
```bash
curl "$SERVICE_URL/routes/onet-career/overview/17-2071.00"
```
예상: JSON 응답 with Electrical Engineers 정보

### 4. 기능 테스트 (브라우저)

1. ✅ **앱 접속**
   - URL: 위에서 확인한 SERVICE_URL

2. ✅ **테스트 완료**
   - Interest, Ability, Knowledge, 또는 Skills 중 하나 완료

3. ✅ **결과 페이지**
   - Results → Careers 탭 이동
   - 추천 직업 카드들 확인

4. ✅ **O*NET 통합 테스트**
   - 직업 카드 클릭 (hover 시 pointer cursor 확인)
   - Career Detail 페이지로 이동 확인
   - 다음 정보 표시 확인:
     - [ ] 직업명 및 O*NET 코드
     - [ ] Bright Outlook 배지 (해당하는 경우)
     - [ ] Also Known As 섹션
     - [ ] What They Do 설명
     - [ ] On the Job 업무 목록
     - [ ] Learn More 리소스 링크
     - [ ] My Next Move 외부 링크

5. ✅ **리소스 링크 테스트**
   - Knowledge, Skills, Abilities 링크 클릭
   - O*NET 외부 페이지로 이동 확인

### 5. 로그 확인
```bash
gcloud run services logs read vacare-app --region=us-central1 --limit=20
```

예상 로그:
- ✅ 정상 시작 메시지
- ✅ O*NET API 호출 성공
- ❌ 에러 없음

## 문제 해결

### Build 실패
```bash
# 캐시 삭제 후 재빌드
docker builder prune
docker build --no-cache --target production-cloudrun -t ... .
```

### Deployment 실패
```bash
# 이전 리비전으로 롤백
gcloud run revisions list --service=vacare-app --region=us-central1
gcloud run services update-traffic vacare-app --region=us-central1 --to-revisions=<REVISION>=100
```

### O*NET API 401 에러
```bash
# 환경 변수 확인
gcloud run services describe vacare-app --region=us-central1 \
  --format='value(spec.template.spec.containers[0].env)' | grep ONET
```

## 배포 완료 후

### 1. Git Commit
```bash
git add .
git commit -m "feat: Add O*NET Web Services API integration

- New backend endpoint for career overview (/onet-career/overview)
- Career detail page with real-time O*NET data
- Clickable career recommendation cards
- Environment variables for O*NET credentials
- Deployment scripts and documentation"

git push origin main
```

### 2. 팀 공유
- [ ] 새 기능 데모
- [ ] 배포 문서 공유 (DEPLOYMENT.md, ENV_SETUP.md)
- [ ] 테스트 가이드 공유

### 3. 모니터링 설정
- [ ] Cloud Console에서 메트릭 확인
- [ ] 에러율 모니터링
- [ ] API 응답 시간 확인

## 예상 소요 시간

| 단계 | 예상 시간 |
|------|----------|
| Docker Build | 5-10분 |
| Push to Registry | 2-5분 |
| Deploy to Cloud Run | 2-3분 |
| Update Latest Tag | 1분 |
| **Total** | **~10-20분** |

## 연락처

문제 발생 시:
1. DEPLOYMENT.md 참조
2. 로그 확인 (`gcloud run services logs read ...`)
3. 이슈 생성 또는 팀 문의
