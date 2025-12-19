import type { INotificationProvider } from '../providers/interfaces.js';
import type { ToolResponse } from '../core/types.js';
import { sendNotificationInputSchema } from '../core/validation.js';
import { McpToolError, ErrorCodes, isMcpToolError } from '../core/errors.js';
import { defaultRateLimiter } from '../core/rateLimit.js';
import { logger } from '../core/logger.js';
import { z } from 'zod';

const log = logger.child('SendNotification');

/**
 * send_notification Tool 정의
 */
export const sendNotificationTool = {
  name: 'send_notification',
  description: `지정된 대상에게 메시지/알림을 즉시 전송합니다.

confirm=false: dry-run 모드로 실행하지 않고 검증만 수행
confirm=true: 실제 알림을 전송

예시:
- 사용자에게 알림: target_type="user", target_id="user123"
- 그룹에 알림: target_type="group", target_id="group456"`,
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
      confirm: {
        type: 'boolean',
        description: 'true=실행, false=dry-run',
      },
    },
    required: ['target_type', 'target_id', 'message', 'confirm'],
  },
};

/**
 * send_notification Tool 핸들러
 */
export async function handleSendNotification(
  args: unknown,
  provider: INotificationProvider
): Promise<ToolResponse> {
  try {
    // 입력 검증
    const input = sendNotificationInputSchema.parse(args);

    // Rate Limit 체크
    const rateLimitKey = `notification:${input.target_id}`;
    const rateCheck = defaultRateLimiter.check(rateLimitKey);

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

    // 실행
    const result = await provider.send({
      targetType: input.target_type,
      targetId: input.target_id,
      message: input.message,
      confirm: input.confirm,
    });

    log.info('send_notification completed', { status: result.status });

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
