import type { INotificationProvider } from '../providers/interfaces.js';
import type { ToolResponse } from '../core/types.js';
import { scheduleNotificationInputSchema } from '../core/validation.js';
import { McpToolError, ErrorCodes, isMcpToolError } from '../core/errors.js';
import { scheduleRateLimiter } from '../core/rateLimit.js';
import { scheduler } from '../core/scheduler.js';
import { logger } from '../core/logger.js';
import { z } from 'zod';

const log = logger.child('ScheduleNotification');

/**
 * schedule_notification Tool 정의
 */
export const scheduleNotificationTool = {
  name: 'schedule_notification',
  description: `미래 시점에 알림 실행을 예약합니다.

confirm=false: dry-run 모드로 예약하지 않고 검증만 수행
confirm=true: 실제로 알림을 예약

주의사항:
- execute_at은 미래 시점이어야 합니다 (ISO8601 형식)
- idempotency_key로 중복 예약을 방지합니다
- 동일한 idempotency_key로 다시 호출하면 기존 jobId를 반환합니다`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      target_type: {
        type: 'string',
        enum: ['user', 'group'],
        description: '수신자 유형',
      },
      target_id: {
        type: 'string',
        minLength: 1,
        maxLength: 64,
        description: '수신자 ID',
      },
      message: {
        type: 'string',
        minLength: 1,
        maxLength: 2000,
        description: '전송할 메시지 (1~2000자)',
      },
      execute_at: {
        type: 'string',
        description: '실행 시점 (ISO8601, 미래 시점만)',
      },
      idempotency_key: {
        type: 'string',
        minLength: 1,
        maxLength: 128,
        description: '중복 방지 키',
      },
      confirm: {
        type: 'boolean',
        description: 'true=예약, false=dry-run',
      },
    },
    required: ['target_type', 'target_id', 'message', 'execute_at', 'idempotency_key', 'confirm'],
  },
};

/**
 * schedule_notification Tool 핸들러
 */
export async function handleScheduleNotification(
  args: unknown,
  provider: INotificationProvider
): Promise<ToolResponse> {
  try {
    // 입력 검증
    const input = scheduleNotificationInputSchema.parse(args);

    // Rate Limit 체크
    const rateLimitKey = `schedule:${input.target_id}`;
    const rateCheck = scheduleRateLimiter.check(rateLimitKey);

    if (!rateCheck.allowed) {
      throw new McpToolError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', {
        resetAt: rateCheck.resetAt,
        remaining: rateCheck.remaining,
      });
    }

    // 대상 유효성 검증
    const isValid = await provider.validateTarget(input.target_type, input.target_id);
    if (!isValid) {
      throw new McpToolError('INVALID_TARGET', 'Invalid target');
    }

    const timestamp = new Date().toISOString();

    // Dry-run 모드
    if (!input.confirm) {
      log.debug('Dry-run mode');
      const result = {
        status: 'requires_confirmation' as const,
        timestamp,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    // 스케줄러에 Provider 설정
    scheduler.setProvider(provider);
    scheduler.start();

    // 작업 예약
    const { jobId, isNew } = scheduler.schedule({
      targetType: input.target_type,
      targetId: input.target_id,
      message: input.message,
      executeAt: input.execute_at,
      idempotencyKey: input.idempotency_key,
      confirm: true,
    });

    const result = {
      status: 'scheduled' as const,
      jobId,
      isNew,
      executeAt: input.execute_at,
      timestamp,
    };

    log.info('schedule_notification completed', { jobId, isNew });

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
