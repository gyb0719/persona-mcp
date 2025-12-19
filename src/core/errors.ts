import type { ExecutionResult } from './types.js';

/**
 * 에러 코드 상수
 */
export const ErrorCodes = {
  // 검증 에러 (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_TARGET: 'INVALID_TARGET',
  INVALID_TIME: 'INVALID_TIME',
  PAST_TIME: 'PAST_TIME',
  END_BEFORE_START: 'END_BEFORE_START',
  DURATION_TOO_LONG: 'DURATION_TOO_LONG',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  MESSAGE_EMPTY: 'MESSAGE_EMPTY',
  DUPLICATE_SCHEDULE: 'DUPLICATE_SCHEDULE',

  // Rate Limit 에러
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 실행 에러 (5xx)
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  TIMEOUT: 'TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * MCP Tool 에러 클래스
 */
export class McpToolError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'McpToolError';
    this.code = code;
    this.details = details;
  }

  /**
   * ExecutionResult 형식으로 변환
   */
  toResponse(): ExecutionResult {
    return {
      status: 'failed',
      error: this.code,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * JSON 직렬화를 위한 메서드
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * 에러 응답 생성 헬퍼
 */
export function createErrorResponse(code: ErrorCode): ExecutionResult {
  return {
    status: 'failed',
    error: code,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 에러인지 확인하는 타입 가드
 */
export function isMcpToolError(error: unknown): error is McpToolError {
  return error instanceof McpToolError;
}
