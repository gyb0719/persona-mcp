/**
 * 실행 상태 타입
 */
export type ExecutionStatus =
  | 'sent'
  | 'scheduled'
  | 'created'
  | 'requires_confirmation'
  | 'failed';

/**
 * 대상 타입
 */
export type TargetType = 'user' | 'group';

/**
 * 공통 실행 결과
 */
export interface ExecutionResult {
  status: ExecutionStatus;
  executionId?: string;
  jobId?: string;
  eventId?: string;
  error?: string;
  timestamp: string;
}

/**
 * 알림 요청
 */
export interface NotificationRequest {
  targetType: TargetType;
  targetId: string;
  message: string;
  confirm: boolean;
}

/**
 * 스케줄 요청
 */
export interface ScheduleRequest extends NotificationRequest {
  executeAt: string;
  idempotencyKey: string;
}

/**
 * 이벤트 요청
 */
export interface EventRequest {
  title: string;
  startAt: string;
  endAt: string;
  description?: string;
  confirm: boolean;
}

/**
 * Rate Limit 설정
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate Limit 체크 결과
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * 스케줄된 작업
 */
export interface ScheduledJob {
  id: string;
  idempotencyKey: string;
  executeAt: Date;
  request: NotificationRequest;
  status: 'pending' | 'executed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  error?: string;
}

/**
 * 로그 레벨
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * MCP Tool 응답 콘텐츠
 */
export interface ToolContent {
  type: 'text';
  text: string;
}

/**
 * MCP Tool 응답
 */
export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}
