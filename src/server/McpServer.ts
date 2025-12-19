import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { IProviderFactory } from '../providers/interfaces.js';
import { logger } from '../core/logger.js';
import { ErrorCodes, isMcpToolError } from '../core/errors.js';
import { defaultRateLimiter, scheduleRateLimiter } from '../core/rateLimit.js';
import { scheduler } from '../core/scheduler.js';

const log = logger.child('Server');

/**
 * MCP Server 설정
 */
interface ServerConfig {
  name: string;
  version: string;
}

/**
 * Tool 응답 생성 헬퍼
 */
function createResponse(data: unknown): { content: { type: 'text'; text: string }[] } {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * 에러 응답 생성 헬퍼
 */
function createErrorResponseContent(
  error: string,
  details?: unknown
): { content: { type: 'text'; text: string }[] } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'failed',
          error,
          details,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  };
}

/**
 * Command Execution MCP Server 생성
 */
export function createMcpServer(
  providers: IProviderFactory,
  config?: Partial<ServerConfig>
): McpServer {
  const serverConfig = {
    name: config?.name ?? 'command-execution-mcp',
    version: config?.version ?? '1.0.0',
  };

  const server = new McpServer(serverConfig);
  const notificationProvider = providers.getNotificationProvider();
  const calendarProvider = providers.getCalendarProvider();

  // Tool 1: send_notification
  server.tool(
    'send_notification',
    '지정된 대상에게 메시지/알림을 즉시 전송합니다. confirm=false는 dry-run, confirm=true는 실제 전송.',
    {
      target_type: z.enum(['user', 'group']).describe('수신자 유형'),
      target_id: z.string().min(1).max(64).describe('수신자 ID'),
      message: z.string().min(1).max(2000).describe('전송할 메시지 (1~2000자)'),
      confirm: z.boolean().describe('true=실행, false=dry-run'),
    },
    async ({ target_type, target_id, message, confirm }) => {
      try {
        // Rate Limit
        const rateCheck = defaultRateLimiter.check(`notification:${target_id}`);
        if (!rateCheck.allowed) {
          return createErrorResponseContent(ErrorCodes.RATE_LIMIT_EXCEEDED);
        }

        // Target 검증
        const isValid = await notificationProvider.validateTarget(target_type, target_id);
        if (!isValid) {
          return createErrorResponseContent(ErrorCodes.INVALID_TARGET);
        }

        // 실행
        const result = await notificationProvider.send({
          targetType: target_type,
          targetId: target_id,
          message,
          confirm,
        });

        log.info('send_notification completed', { status: result.status });
        return createResponse(result);
      } catch (error) {
        log.error('send_notification error', error);
        if (isMcpToolError(error)) {
          return createErrorResponseContent(error.code);
        }
        return createErrorResponseContent(ErrorCodes.INTERNAL_ERROR);
      }
    }
  );

  // Tool 2: schedule_notification
  server.tool(
    'schedule_notification',
    '미래 시점에 알림 실행을 예약합니다. idempotency_key로 중복 예약을 방지합니다.',
    {
      target_type: z.enum(['user', 'group']).describe('수신자 유형'),
      target_id: z.string().min(1).max(64).describe('수신자 ID'),
      message: z.string().min(1).max(2000).describe('전송할 메시지'),
      execute_at: z.string().describe('실행 시점 (ISO8601, 미래 시점만)'),
      idempotency_key: z.string().min(1).max(128).describe('중복 방지 키'),
      confirm: z.boolean().describe('true=예약, false=dry-run'),
    },
    async ({ target_type, target_id, message, execute_at, idempotency_key, confirm }) => {
      try {
        // 미래 시점 검증
        const executeDate = new Date(execute_at);
        if (isNaN(executeDate.getTime())) {
          return createErrorResponseContent(ErrorCodes.INVALID_TIME);
        }
        if (executeDate <= new Date()) {
          return createErrorResponseContent(ErrorCodes.PAST_TIME);
        }

        // Rate Limit
        const rateCheck = scheduleRateLimiter.check(`schedule:${target_id}`);
        if (!rateCheck.allowed) {
          return createErrorResponseContent(ErrorCodes.RATE_LIMIT_EXCEEDED);
        }

        // Target 검증
        const isValid = await notificationProvider.validateTarget(target_type, target_id);
        if (!isValid) {
          return createErrorResponseContent(ErrorCodes.INVALID_TARGET);
        }

        const timestamp = new Date().toISOString();

        // Dry-run
        if (!confirm) {
          return createResponse({
            status: 'requires_confirmation',
            timestamp,
          });
        }

        // 스케줄러 설정 및 예약
        scheduler.setProvider(notificationProvider);
        scheduler.start();

        const { jobId, isNew } = scheduler.schedule({
          targetType: target_type,
          targetId: target_id,
          message,
          executeAt: execute_at,
          idempotencyKey: idempotency_key,
          confirm: true,
        });

        log.info('schedule_notification completed', { jobId, isNew });
        return createResponse({
          status: 'scheduled',
          jobId,
          isNew,
          executeAt: execute_at,
          timestamp,
        });
      } catch (error) {
        log.error('schedule_notification error', error);
        if (isMcpToolError(error)) {
          return createErrorResponseContent(error.code);
        }
        return createErrorResponseContent(ErrorCodes.INTERNAL_ERROR);
      }
    }
  );

  // Tool 3: summarize_and_execute
  server.tool(
    'summarize_and_execute',
    'LLM이 생성한 요약 결과를 받아 전송 실행까지 연결합니다. 이 Tool은 요약을 생성하지 않습니다.',
    {
      summary_text: z.string().min(1).max(2000).describe('LLM이 생성한 요약 텍스트'),
      target_type: z.enum(['user', 'group']).describe('수신자 유형'),
      target_id: z.string().min(1).max(64).describe('수신자 ID'),
      confirm: z.boolean().describe('true=실행, false=dry-run'),
    },
    async ({ summary_text, target_type, target_id, confirm }) => {
      try {
        // Rate Limit
        const rateCheck = defaultRateLimiter.check(`summary:${target_id}`);
        if (!rateCheck.allowed) {
          return createErrorResponseContent(ErrorCodes.RATE_LIMIT_EXCEEDED);
        }

        // Target 검증
        const isValid = await notificationProvider.validateTarget(target_type, target_id);
        if (!isValid) {
          return createErrorResponseContent(ErrorCodes.INVALID_TARGET);
        }

        // 전송 (send_notification과 동일 로직)
        const result = await notificationProvider.send({
          targetType: target_type,
          targetId: target_id,
          message: summary_text,
          confirm,
        });

        log.info('summarize_and_execute completed', { status: result.status });
        return createResponse(result);
      } catch (error) {
        log.error('summarize_and_execute error', error);
        if (isMcpToolError(error)) {
          return createErrorResponseContent(error.code);
        }
        return createErrorResponseContent(ErrorCodes.INTERNAL_ERROR);
      }
    }
  );

  // Tool 4: create_event
  server.tool(
    'create_event',
    '외부 캘린더/시스템에 일정을 생성합니다. 시작/종료 시간은 ISO8601 형식이며, 최대 7일 기간까지 가능합니다.',
    {
      title: z.string().min(1).max(200).describe('일정 제목'),
      start_at: z.string().describe('시작 시간 (ISO8601)'),
      end_at: z.string().describe('종료 시간 (ISO8601)'),
      description: z.string().max(1000).optional().describe('일정 설명'),
      confirm: z.boolean().describe('true=생성, false=dry-run'),
    },
    async ({ title, start_at, end_at, description, confirm }) => {
      try {
        // 시간 검증
        const startDate = new Date(start_at);
        const endDate = new Date(end_at);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return createErrorResponseContent(ErrorCodes.INVALID_TIME);
        }
        if (startDate <= new Date()) {
          return createErrorResponseContent(ErrorCodes.PAST_TIME);
        }
        if (endDate <= startDate) {
          return createErrorResponseContent(ErrorCodes.END_BEFORE_START);
        }

        const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7일
        if (endDate.getTime() - startDate.getTime() > maxDuration) {
          return createErrorResponseContent(ErrorCodes.DURATION_TOO_LONG);
        }

        // Rate Limit
        const rateCheck = defaultRateLimiter.check('calendar:create');
        if (!rateCheck.allowed) {
          return createErrorResponseContent(ErrorCodes.RATE_LIMIT_EXCEEDED);
        }

        // 실행
        const result = await calendarProvider.createEvent({
          title,
          startAt: start_at,
          endAt: end_at,
          description,
          confirm,
        });

        log.info('create_event completed', { status: result.status });
        return createResponse(result);
      } catch (error) {
        log.error('create_event error', error);
        if (isMcpToolError(error)) {
          return createErrorResponseContent(error.code);
        }
        return createErrorResponseContent(ErrorCodes.INTERNAL_ERROR);
      }
    }
  );

  log.info('MCP server created', {
    name: serverConfig.name,
    version: serverConfig.version,
  });

  return server;
}
