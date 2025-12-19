import type { INotificationProvider } from '../providers/interfaces.js';
import type { ToolResponse } from '../core/types.js';
import { summarizeAndExecuteInputSchema } from '../core/validation.js';
import { McpToolError, ErrorCodes, isMcpToolError } from '../core/errors.js';
import { defaultRateLimiter } from '../core/rateLimit.js';
import { logger } from '../core/logger.js';
import { z } from 'zod';

const log = logger.child('SummarizeAndExecute');

/**
 * summarize_and_execute Tool 정의
 */
export const summarizeAndExecuteTool = {
  name: 'summarize_and_execute',
  description: `LLM이 생성한 요약 결과를 받아 지정된 대상에게 전송합니다.

중요: 이 Tool은 요약을 생성하지 않습니다!
- LLM이 먼저 요약을 생성한 후, 그 결과를 summary_text로 전달해야 합니다
- 이 Tool은 "실행"만 담당합니다

confirm=false: dry-run 모드로 실행하지 않고 검증만 수행
confirm=true: 실제 전송 실행

사용 예시:
1. LLM이 긴 문서를 요약
2. 요약 결과를 summary_text에 전달
3. 지정된 대상에게 요약 내용을 전송`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      summary_text: {
        type: 'string',
        minLength: 1,
        maxLength: 2000,
        description: 'LLM이 생성한 요약 텍스트',
      },
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
      confirm: {
        type: 'boolean',
        description: 'true=실행, false=dry-run',
      },
    },
    required: ['summary_text', 'target_type', 'target_id', 'confirm'],
  },
};

/**
 * summarize_and_execute Tool 핸들러
 */
export async function handleSummarizeAndExecute(
  args: unknown,
  provider: INotificationProvider
): Promise<ToolResponse> {
  try {
    // 입력 검증
    const input = summarizeAndExecuteInputSchema.parse(args);

    // Rate Limit 체크
    const rateLimitKey = `summary:${input.target_id}`;
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

    // send_notification과 동일한 전송 로직 사용
    const result = await provider.send({
      targetType: input.target_type,
      targetId: input.target_id,
      message: input.summary_text,
      confirm: input.confirm,
    });

    log.info('summarize_and_execute completed', { status: result.status });

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
