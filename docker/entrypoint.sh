@@ .. @@
         log_info "🔧 개발 모드로 실행합니다..."
         
         # 개발 환경: 프론트엔드와 백엔드를 병렬로 실행
-        cd /app/frontend && npm run dev &
+        cd /app/frontend && yarn dev &
         FRONTEND_PID=$!
         
         cd /app/backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
@@ .. @@
         log_info "🌐 프론트엔드만 실행합니다..."
         cd /app/frontend
         if [ "$NODE_ENV" = "development" ]; then
-            npm run dev
+            yarn dev
         else
-            npx serve -s dist -l 3000
+            yarn dlx serve -s dist -l 3000
         fi
@@ .. @@
         if [ ! -d "/app/frontend/dist" ]; then
             log_warning "⚠️  프론트엔드 빌드 파일이 없습니다. 빌드를 실행합니다..."
             cd /app/frontend
-            npm run build || log_error "프론트엔드 빌드 실패"
+            yarn build || log_error "프론트엔드 빌드 실패"
         fi
@@ .. @@
         log_info "🧪 테스트를 실행합니다..."
-        cd /app/backend && python -m pytest &
-        cd /app/frontend && npm test &
+        cd /app/backend && python -m pytest &
+        cd /app/frontend && yarn test &
         wait