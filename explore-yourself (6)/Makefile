.PHONY: build up down logs dev prod clean

# 개발 환경
dev:
	docker-compose -f docker-compose.dev.yml up --build

# 프로덕션 환경
prod:
	docker-compose up --build

# 백그라운드 실행
up:
	docker-compose up -d --build

# 중지
down:
	docker-compose down

# 로그 확인
logs:
	docker-compose logs -f

# 정리
clean:
	docker-compose down -v
	docker system prune -f
