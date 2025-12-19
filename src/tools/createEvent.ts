import type { ICalendarProvider } from '../providers/interfaces.js';
import type { ToolResponse } from '../core/types.js';
import { createEventInputSchema } from '../core/validation.js';
import { McpToolError, ErrorCodes, isMcpToolError } from '../core/errors.js';
import { defaultRateLimiter } from '../core/rateLimit.js';
import { logger } from '../core/logger.js';
import { z } from 'zod';

const log = logger.child('CreateEvent');

/**
 * create_event Tool 정의
 */
export const createEventTool = {
  name: 'create_event',
  description: `외부 캘린더/시스템에 일정을 생성합니다.

confirm=false: dry-run 모드로 생성하지 않고 검증만 수행
confirm=true: 실제 일정 생성

검증 규칙:
- start_at은 미래 시점이어야 합니다
- end_at은 start_at 이후여야 합니다
- 일정 기간은 최대 7일까지 가능합니다
- 시간은 ISO8601 형식 (예: 2024-01-15T10:00:00Z)`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: '일정 제목',
      },
      start_at: {
        type: 'string',
        description: '시작 시간 (ISO8601)',
      },
      end_at: {
        type: 'string',
        description: '종료 시간 (ISO8601)',
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: '일정 설명 (선택)',
      },
      confirm: {
        type: 'boolean',
        description: 'true=생성, false=dry-run',
      },
    },
    required: ['title', 'start_at', 'end_at', 'confirm'],
  },
};

/**
 * create_event Tool 핸들러
 */
export async function handleCreateEvent(
  args: unknown,
  provider: ICalendarProvider
): Promise<ToolResponse> {
  try {
    // 입력 검증
    const input = createEventInputSchema.parse(args);

    // Rate Limit 체크
    const rateLimitKey = 'calendar:create';
    const rateCheck = defaultRateLimiter.check(rateLimitKey);

    if (!rateCheck.allowed) {
      throw new McpToolError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', {
        resetAt: rateCheck.resetAt,
        remaining: rateCheck.remaining,
      });
    }

    // 충돌 체크 (confirm=true일 때만)
    if (input.confirm) {
      const hasConflict = await provider.checkConflict(input.start_at, input.end_at);
      if (hasConflict) {
        log.warn('Schedule conflict detected');
        const result = {
          status: 'failed' as const,
          error: 'SCHEDULE_CONFLICT',
          timestamp: new Date().toISOString(),
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: true,
        };
      }
    }

    // 실행
    const result = await provider.createEvent({
      title: input.title,
      startAt: input.start_at,
      endAt: input.end_at,
      description: input.description,
      confirm: input.confirm,
    });

    log.info('create_event completed', { status: result.status });

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const result = {
        status: 'failed' as const,
        error: ErrorCodes.VALIDATION_ERROR,
        details: error.errors,
        timestamp: new Date().toISOString(),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: true,
      };
    }

    if (isMcpToolError(error)) {
      return {
        content: [{ type: 'text', text: JSON.stringify(error.toResponse(), null, 2) }],
        isError: true,
      };
    }

    log.error('Unexpected error', error);
    const result = {
      status: 'failed' as const,
      error: ErrorCodes.INTERNAL_ERROR,
      timestamp: new Date().toISOString(),
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: true,
    };
  }
}
