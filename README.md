# Command Execution MCP Server

LLM이 자연어 명령을 통해 외부 시스템의 **실제 실행(Action)**을 안전하고 일관되게 수행할 수 있도록 돕는 MCP Server입니다.

## 핵심 특징

- **실행 중심**: AI가 "말"만 하는 것이 아니라 검증된 실행을 트리거
- **안전한 실행**: `confirm` 플래그로 dry-run과 실제 실행 분리
- **Rate Limit**: 과도한 요청 방지
- **멱등성 보장**: `idempotency_key`로 중복 실행 방지

## 제공 Tools (4개)

### 1. send_notification
지정된 대상에게 메시지/알림을 즉시 전송합니다.

```json
{
  "target_type": "user",
  "target_id": "user123",
  "message": "안녕하세요!",
  "confirm": true
}
```

### 2. schedule_notification
미래 시점에 알림 실행을 예약합니다.

```json
{
  "target_type": "group",
  "target_id": "team-dev",
  "message": "회의 시작 10분 전입니다",
  "execute_at": "2024-01-15T09:50:00Z",
  "idempotency_key": "meeting-reminder-123",
  "confirm": true
}
```

### 3. summarize_and_execute
LLM이 생성한 요약 결과를 받아 전송 실행까지 연결합니다.

> **중요**: 이 Tool은 요약을 생성하지 않습니다. LLM이 먼저 요약을 생성한 후, 그 결과를 전달해야 합니다.

```json
{
  "summary_text": "오늘 회의 요약: 1. 프로젝트 일정 확정 2. 다음 주 마일스톤 설정",
  "target_type": "group",
  "target_id": "team-dev",
  "confirm": true
}
```

### 4. create_event
외부 캘린더/시스템에 일정을 생성합니다.

```json
{
  "title": "팀 미팅",
  "start_at": "2024-01-15T14:00:00Z",
  "end_at": "2024-01-15T15:00:00Z",
  "description": "주간 팀 미팅",
  "confirm": true
}
```

## confirm 플래그 (Dry-run vs 실행)

모든 Tool은 `confirm` 플래그를 지원합니다:

| confirm | 동작 | 응답 status |
|---------|------|-------------|
| `false` | Dry-run (검증만) | `requires_confirmation` |
| `true` | 실제 실행 | `sent` / `scheduled` / `created` |

## 빠른 시작

### 설치

```bash
npm install
npm run build
```

### 실행

```bash
npm start
```

### 개발 모드

```bash
npm run dev
```

### MCP Inspector로 테스트

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## 환경 변수

```bash
# 서버 설정
MCP_SERVER_NAME=command-execution-mcp
MCP_SERVER_VERSION=1.0.0

# Rate Limit
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_WINDOW_MS=60000

# Mock Provider 실패율 (0-1)
MOCK_FAILURE_RATE=0.1

# 로깅
LOG_LEVEL=info
```

## 프로젝트 구조

```
src/
├── index.ts                    # 진입점
├── server/
│   └── McpServer.ts            # MCP 서버 설정
├── tools/
│   ├── sendNotification.ts
│   ├── scheduleNotification.ts
│   ├── summarizeAndExecute.ts
│   └── createEvent.ts
├── providers/
│   ├── interfaces.ts           # Provider 인터페이스
│   └── mock/                   # Mock 구현
│       ├── MockNotificationProvider.ts
│       └── MockCalendarProvider.ts
└── core/
    ├── types.ts                # 공통 타입
    ├── validation.ts           # Zod 스키마
    ├── rateLimit.ts            # Rate Limiter
    ├── errors.ts               # 에러 처리
    ├── logger.ts               # 로깅
    └── scheduler.ts            # 작업 스케줄러
```

## Provider 확장

실제 서비스와 연동하려면 `INotificationProvider` 또는 `ICalendarProvider` 인터페이스를 구현합니다:

```typescript
import { INotificationProvider } from './providers/interfaces';

export class SlackNotificationProvider implements INotificationProvider {
  async send(request: NotificationRequest): Promise<ExecutionResult> {
    // Slack API 호출
  }

  async validateTarget(targetType: string, targetId: string): Promise<boolean> {
    // 채널/사용자 검증
  }
}
```

## 테스트

```bash
# 전체 테스트
npm test

# 단일 실행
npm run test:run

# 커버리지
npm run test -- --coverage
```

## 응답 형식

모든 Tool은 일관된 응답 형식을 사용합니다:

```typescript
// 성공
{
  "status": "sent",
  "executionId": "exec_abc123",
  "timestamp": "2024-01-15T10:00:00.000Z"
}

// Dry-run
{
  "status": "requires_confirmation",
  "timestamp": "2024-01-15T10:00:00.000Z"
}

// 실패
{
  "status": "failed",
  "error": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 에러 코드

| 코드 | 설명 |
|------|------|
| `VALIDATION_ERROR` | 입력 검증 실패 |
| `INVALID_TARGET` | 유효하지 않은 대상 |
| `RATE_LIMIT_EXCEEDED` | 요청 제한 초과 |
| `PAST_TIME` | 과거 시점 지정 |
| `END_BEFORE_START` | 종료 시간이 시작 시간보다 이전 |
| `EXECUTION_FAILED` | 실행 실패 |

## 라이센스

MIT
