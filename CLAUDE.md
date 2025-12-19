# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build
npm run build

# Run (STDIO mode - for MCP clients)
npm run start

# Run (HTTP mode - for web deployment)
npm run start:http

# Development
npm run dev          # STDIO mode with tsx
npm run dev:http     # HTTP mode with tsx
```

## Architecture

MCP 서버 기반의 AI 롤플레이 캐릭터 관리 엔진.

### Core Flow
1. `list_characters` - 템플릿(10종) + 사용자 캐릭터 목록 조회
2. `create_character` - 템플릿 기반 또는 커스텀 캐릭터 생성
3. `start_roleplay` - 세션 생성, 캐릭터의 첫 인사 + 시스템 프롬프트 반환
4. `continue_roleplay` - 대화 기록 + 메모리 추출 + 업데이트된 컨텍스트 반환

### Module Structure
- `src/server/McpServer.ts` - MCP 도구 등록 및 서버 설정
- `src/tools/` - 각 MCP 도구 구현 (listCharacters, createCharacter, startRoleplay 등)
- `src/storage/` - StorageProvider 인터페이스 + InMemoryStorage 구현
- `src/templates/defaultTemplates.ts` - 기본 캐릭터 템플릿 10종
- `src/core/types.ts` - Character, Session, Memory, RoleplayContext 등 타입 정의

### Entry Points
- `src/index.ts` - STDIO 모드 (MCP 클라이언트용)
- `src/http.ts` - HTTP 모드 (웹 배포용, Express 기반)

### HTTP Endpoints
- `GET /health` - 상태 체크 + 스토리지 통계
- `POST /mcp` - MCP 요청 처리 (x-session-id 헤더로 세션 관리)
- `GET /mcp` - SSE 스트리밍
- `DELETE /mcp` - 세션 종료
