FROM node:20-alpine

WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY dist/ ./dist/

# 환경 변수
ENV NODE_ENV=production
ENV PORT=3000

# 포트 노출
EXPOSE 3000

# HTTP 서버 실행
CMD ["node", "dist/http.js"]
