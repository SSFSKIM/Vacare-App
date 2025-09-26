#!/bin/bash

# VA-Care Docker Entrypoint Script
# 컨테이너 시작 시 실행되는 초기화 스크립트

set -e  # 에러 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 기본값 설정
export PYTHONPATH="${PYTHONPATH:-/app/backend}"
export PYTHONUNBUFFERED="${PYTHONUNBUFFERED:-1}"
export NODE_ENV="${NODE_ENV:-production}"

log_info "🚀 VA-Care 애플리케이션을 시작합니다..."
log_info "환경: $NODE_ENV"

# 환경별 설정
if [ "$NODE_ENV" = "development" ]; then
    log_info "🔧 개발 환경으로 설정됩니다"
    export DEBUG=1
    export FASTAPI_ENV=development
else
    log_info "🏭 프로덕션 환경으로 설정됩니다"
    export DEBUG=0
    export FASTAPI_ENV=production
fi

# 필수 디렉토리 생성
log_info "📁 필요한 디렉토리를 생성합니다..."
mkdir -p /app/logs
mkdir -p /app/data
mkdir -p /var/log/nginx
mkdir -p /var/log/supervisor

# 권한 설정
chmod -R 755 /app/logs
chmod -R 755 /app/data

# 데이터베이스 연결 대기 함수
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1

    log_info "⏳ $service_name 서비스 연결을 기다립니다 ($host:$port)..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            log_success "✅ $service_name 서비스가 준비되었습니다!"
            return 0
        fi
        
        log_info "⏳ $service_name 연결 시도 $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "❌ $service_name 서비스에 연결할 수 없습니다"
    return 1
}

# 외부 서비스 연결 확인
if [ -n "$DATABASE_URL" ]; then
    # PostgreSQL URL 파싱 (예: postgresql://user:pass@host:port/db)
    if [[ $DATABASE_URL =~ postgresql://[^@]*@([^:]+):([0-9]+)/ ]]; then
        DB_HOST="${BASH_REMATCH[1]}"
        DB_PORT="${BASH_REMATCH[2]}"
        wait_for_service "$DB_HOST" "$DB_PORT" "PostgreSQL"
    fi
fi

if [ -n "$REDIS_URL" ]; then
    # Redis URL 파싱 (예: redis://host:port)
    if [[ $REDIS_URL =~ redis://([^:]+):([0-9]+) ]]; then
        REDIS_HOST="${BASH_REMATCH[1]}"
        REDIS_PORT="${BASH_REMATCH[2]}"
        wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis"
    fi
fi

# 데이터베이스 마이그레이션 실행 (프로덕션 환경에서)
if [ "$NODE_ENV" = "production" ] && [ -n "$DATABASE_URL" ]; then
    log_info "🗄️  데이터베이스 마이그레이션을 실행합니다..."
    cd /app/backend
    
    # Alembic 마이그레이션이 있다면 실행
    if [ -f "alembic.ini" ]; then
        python -m alembic upgrade head || log_warning "마이그레이션 실행 중 오류가 발생했습니다"
    fi
    
    # 또는 Django 스타일 마이그레이션
    if [ -f "manage.py" ]; then
        python manage.py migrate || log_warning "Django 마이그레이션 실행 중 오류가 발생했습니다"
    fi
fi

# 정적 파일 수집 (프로덕션 환경에서)
if [ "$NODE_ENV" = "production" ]; then
    log_info "📦 정적 파일을 확인합니다..."
    
    if [ ! -d "/app/frontend/dist" ]; then
        log_warning "⚠️  프론트엔드 빌드 파일이 없습니다. 빌드를 실행합니다..."
        cd /app/frontend
        npm run build || log_error "프론트엔드 빌드 실패"
    fi
fi

# 환경별 실행 방식
case "$1" in
    "dev"|"development")
        log_info "🔧 개발 모드로 실행합니다..."
        
        # 개발 환경: 프론트엔드와 백엔드를 병렬로 실행
        cd /app/frontend && npm run dev &
        FRONTEND_PID=$!
        
        cd /app/backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
        BACKEND_PID=$!
        
        # 시그널 핸들링
        trap 'kill $FRONTEND_PID $BACKEND_PID; wait $FRONTEND_PID $BACKEND_PID' TERM INT
        
        log_success "✅ 개발 서버가 시작되었습니다!"
        log_info "🌐 프론트엔드: http://localhost:3000"
        log_info "🔧 백엔드: http://localhost:8000"
        
        # 프로세스들이 실행 중인지 확인
        wait $FRONTEND_PID $BACKEND_PID
        ;;
        
    "backend")
        log_info "🔧 백엔드만 실행합니다..."
        cd /app/backend
        if [ "$NODE_ENV" = "development" ]; then
            uvicorn main:app --host 0.0.0.0 --port 8000 --reload
        else
            uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
        fi
        ;;
        
    "frontend")
        log_info "🌐 프론트엔드만 실행합니다..."
        cd /app/frontend
        if [ "$NODE_ENV" = "development" ]; then
            npm run dev
        else
            npx serve -s dist -l 3000
        fi
        ;;
        
    "migrate")
        log_info "🗄️  데이터베이스 마이그레이션만 실행합니다..."
        cd /app/backend
        if [ -f "alembic.ini" ]; then
            python -m alembic upgrade head
        fi
        ;;
        
    "test")
        log_info "🧪 테스트를 실행합니다..."
        cd /app/backend && python -m pytest &
        cd /app/frontend && npm test &
        wait
        ;;
        
    "shell")
        log_info "🐚 셸을 시작합니다..."
        exec /bin/bash
        ;;
        
    *)
        # 기본값: 프로덕션 모드 (Supervisor로 실행)
        log_info "🏭 프로덕션 모드로 실행합니다..."
        
        # Nginx 설정 파일 검증
        nginx -t || {
            log_error "Nginx 설정 파일에 오류가 있습니다!"
            exit 1
        }
        
        # Supervisor 설정 파일 검증
        if [ -f "/etc/supervisor/conf.d/supervisord.conf" ]; then
            log_success "Supervisor 설정이 확인되었습니다"
        else
            log_error "Supervisor 설정 파일이 없습니다!"
            exit 1
        fi
        
        log_success "✅ 모든 서비스를 시작합니다!"
        
        # 전달된 명령어가 있으면 그것을 실행, 없으면 supervisord 실행
        if [ $# -eq 0 ]; then
            exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
        else
            exec "$@"
        fi
        ;;
esac

log_success "🎉 VA-Care 애플리케이션이 성공적으로 시작되었습니다!"
