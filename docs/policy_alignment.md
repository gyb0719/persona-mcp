# PlayMCP 정책 준수 문서

Command Execution MCP Server가 PlayMCP 심사 정책을 어떻게 준수하는지 설명합니다.

## 정책 준수 체크리스트

### 1. Tool 개수 (3~6개)

| 체크 | 항목 |
|:----:|------|
| ✅ | Tool 개수: **4개** (범위 내) |

제공 Tools:
1. `send_notification`
2. `schedule_notification`
3. `summarize_and_execute`
4. `create_event`

### 2. MCP/Tool 이름 제한

| 체크 | 항목 |
|:----:|------|
| ✅ | MCP 이름에 "kakao" 미포함 |
| ✅ | Tool 이름에 "kakao" 미포함 |

MCP 이름: `command-execution-mcp`

### 3. 자사 서비스 인증 정보 사용 금지

| 체크 | 항목 |
|:----:|------|
| ✅ | Mock Provider 사용 |
| ✅ | 실제 서비스 인증 정보 미포함 |
| ✅ | Adapter 패턴으로 확장 가능 |

#### 설명

- 기본 제공되는 `MockNotificationProvider`와 `MockCalendarProvider`는 실제 서비스와 연동하지 않음
- 실제 연동이 필요한 경우 `INotificationProvider`, `ICalendarProvider` 인터페이스를 구현하여 확장
- 인증 정보는 사용자가 직접 제공해야 함 (환경 변수 등)

### 4. LLM 단독 기능 미제공

| 체크 | 항목 |
|:----:|------|
| ✅ | 요약 생성 기능 없음 |
| ✅ | 검색 기능 없음 |
| ✅ | 실행(Action)만 담당 |

#### summarize_and_execute Tool 설명

이 Tool은 **요약을 생성하지 않습니다**:

```
[LLM] 문서 요약 생성
     ↓
[summarize_and_execute] 요약 결과 수신 → 전송 실행
     ↓
[Provider] 실제 알림 전송
```

- LLM이 먼저 요약을 생성
- 이 Tool은 요약 결과를 **받아서** 전송만 수행
- MCP는 LLM의 기본 기능을 확장하는 "실행 레이어" 역할

### 5. Response Size 제한

| 체크 | 항목 |
|:----:|------|
| ✅ | 메시지 최대 2000자 |
| ✅ | 응답 구조 최소화 |
| ✅ | 24k 이하 보장 |

#### 응답 크기 분석

```typescript
// 최대 응답 크기 예시
{
  "status": "sent",           // ~10 bytes
  "executionId": "exec_...",  // ~20 bytes
  "timestamp": "2024-..."     // ~25 bytes
}
// 총: ~100 bytes (24k 미만)
```

### 6. 개인정보/민감정보 취급 금지

| 체크 | 항목 |
|:----:|------|
| ✅ | 개인정보 저장 안 함 |
| ✅ | 메시지 본문 영구 저장 안 함 |
| ✅ | 인증 정보 로그 출력 안 함 |

#### 데이터 처리 방식

- `targetId`: 익명 식별자로만 사용
- 메시지 본문: 전송 후 Mock Provider에만 일시 저장 (테스트용)
- 실제 연동 시: 메시지는 외부 서비스로 전달 후 삭제

## 추가 안전 장치

### Rate Limiting

```typescript
// 분당 60회 요청 제한
const rateLimiter = new RateLimiter({
  maxRequests: 60,
  windowMs: 60000
});
```

### 입력 검증

Zod 스키마를 사용한 엄격한 입력 검증:

```typescript
// 메시지 길이 제한
message: z.string().min(1).max(2000)

// ISO8601 날짜 형식 검증
execute_at: z.string().datetime()

// 대상 유형 제한
target_type: z.enum(['user', 'group'])
```

### 에러 처리 표준화

모든 에러는 일관된 형식으로 반환:

```typescript
{
  status: 'failed',
  error: ErrorCode,
  timestamp: string
}
```

## 테스트 검증

```bash
npm run test:run
```

테스트 커버리지:
- Rate Limit 동작 검증
- 입력 검증 테스트
- Mock Provider 동작 검증
- confirm 플래그 동작 검증

## 결론

| 정책 | 상태 |
|------|:----:|
| Tool 개수 3~6개 | ✅ |
| "kakao" 미포함 | ✅ |
| 자사 인증 미사용 | ✅ |
| LLM 단독 기능 미제공 | ✅ |
| Response 24k 이하 | ✅ |
| 개인정보 미취급 | ✅ |

**모든 PlayMCP 정책을 준수합니다.**
