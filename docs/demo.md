# 30초 데모 시나리오

Command Execution MCP Server의 핵심 기능을 빠르게 체험할 수 있는 데모 시나리오입니다.

## 준비

```bash
# 빌드
npm run build

# MCP Inspector 실행
npx @modelcontextprotocol/inspector node dist/index.js
```

브라우저에서 `http://127.0.0.1:6274` 접속

## 시나리오 1: 알림 전송 (send_notification)

### Step 1: Dry-run 테스트

```json
{
  "target_type": "user",
  "target_id": "user123",
  "message": "안녕하세요! 테스트 메시지입니다.",
  "confirm": false
}
```

**예상 응답:**
```json
{
  "status": "requires_confirmation",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### Step 2: 실제 전송

```json
{
  "target_type": "user",
  "target_id": "user123",
  "message": "안녕하세요! 테스트 메시지입니다.",
  "confirm": true
}
```

**예상 응답:**
```json
{
  "status": "sent",
  "executionId": "exec_m1234_abc",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 시나리오 2: 알림 예약 (schedule_notification)

### 5분 후 예약

```json
{
  "target_type": "group",
  "target_id": "team-dev",
  "message": "회의가 곧 시작됩니다!",
  "execute_at": "2024-01-15T10:05:00Z",
  "idempotency_key": "meeting-reminder-001",
  "confirm": true
}
```

**예상 응답:**
```json
{
  "status": "scheduled",
  "jobId": "job_m1234_xyz",
  "isNew": true,
  "executeAt": "2024-01-15T10:05:00Z",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### 중복 예약 시도 (같은 idempotency_key)

```json
{
  "target_type": "group",
  "target_id": "team-dev",
  "message": "다른 메시지",
  "execute_at": "2024-01-15T10:05:00Z",
  "idempotency_key": "meeting-reminder-001",
  "confirm": true
}
```

**예상 응답:**
```json
{
  "status": "scheduled",
  "jobId": "job_m1234_xyz",
  "isNew": false,
  "executeAt": "2024-01-15T10:05:00Z",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

> `isNew: false`로 중복 예약이 방지됨을 확인

## 시나리오 3: 요약 전송 (summarize_and_execute)

### LLM이 생성한 요약 전송

```json
{
  "summary_text": "오늘 회의 요약:\n1. Q1 목표 달성률 85%\n2. 신규 기능 3월 출시 예정\n3. 다음 회의: 1/22 14:00",
  "target_type": "group",
  "target_id": "team-all",
  "confirm": true
}
```

**예상 응답:**
```json
{
  "status": "sent",
  "executionId": "exec_m5678_def",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 시나리오 4: 일정 생성 (create_event)

### 내일 오전 10시 회의 생성

```json
{
  "title": "팀 주간 미팅",
  "start_at": "2024-01-16T10:00:00Z",
  "end_at": "2024-01-16T11:00:00Z",
  "description": "주간 진행 상황 공유 및 이슈 논의",
  "confirm": true
}
```

**예상 응답:**
```json
{
  "status": "created",
  "eventId": "evt_m9012_ghi",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 에러 시나리오

### 과거 시점 예약 시도

```json
{
  "target_type": "user",
  "target_id": "user123",
  "message": "테스트",
  "execute_at": "2020-01-01T00:00:00Z",
  "idempotency_key": "past-test",
  "confirm": true
}
```

**예상 응답:**
```json
{
  "status": "failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "message": "미래 시점이어야 합니다",
      "path": ["execute_at"]
    }
  ],
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### 잘못된 대상 ID

```json
{
  "target_type": "user",
  "target_id": "invalid_user",
  "message": "테스트",
  "confirm": true
}
```

**예상 응답:**
```json
{
  "status": "failed",
  "error": "INVALID_TARGET",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 데모 체크리스트

- [ ] send_notification dry-run 성공
- [ ] send_notification 실제 전송 성공
- [ ] schedule_notification 예약 성공
- [ ] schedule_notification 중복 방지 확인
- [ ] summarize_and_execute 전송 성공
- [ ] create_event 일정 생성 성공
- [ ] 에러 케이스 검증
