import { z } from 'zod';

/**
 * 고유 ID 생성
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 실행 ID 생성
 */
export function generateExecutionId(): string {
  return generateId('exec');
}

/**
 * 작업 ID 생성
 */
export function generateJobId(): string {
  return generateId('job');
}

/**
 * 이벤트 ID 생성
 */
export function generateEventId(): string {
  return generateId('evt');
}

/**
 * 대상 타입 스키마
 */
export const targetTypeSchema = z.enum(['user', 'group']).describe('수신자 유형');

/**
 * 대상 ID 스키마
 */
export const targetIdSchema = z
  .string()
  .min(1, '대상 ID는 필수입니다')
  .max(64, '대상 ID는 64자를 초과할 수 없습니다')
  .describe('수신자 ID');

/**
 * 메시지 스키마
 */
export const messageSchema = z
  .string()
  .min(1, '메시지는 필수입니다')
  .max(2000, '메시지는 2000자를 초과할 수 없습니다')
  .describe('전송할 메시지 (1~2000자)');

/**
 * confirm 플래그 스키마
 */
export const confirmSchema = z.boolean().describe('true=실행, false=dry-run');

/**
 * ISO8601 날짜 스키마
 */
export const isoDateTimeSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: '유효한 ISO8601 날짜 형식이 필요합니다' }
);

/**
 * 미래 시점 날짜 스키마
 */
export const futureDateTimeSchema = isoDateTimeSchema.refine(
  (val) => {
    const date = new Date(val);
    return date > new Date();
  },
  { message: '미래 시점이어야 합니다' }
);

/**
 * 멱등성 키 스키마
 */
export const idempotencyKeySchema = z
  .string()
  .min(1, '멱등성 키는 필수입니다')
  .max(128, '멱등성 키는 128자를 초과할 수 없습니다')
  .describe('중복 방지 키');

/**
 * 이벤트 제목 스키마
 */
export const eventTitleSchema = z
  .string()
  .min(1, '제목은 필수입니다')
  .max(200, '제목은 200자를 초과할 수 없습니다')
  .describe('일정 제목');

/**
 * 이벤트 설명 스키마
 */
export const eventDescriptionSchema = z
  .string()
  .max(1000, '설명은 1000자를 초과할 수 없습니다')
  .optional()
  .describe('일정 설명');

/**
 * send_notification 입력 스키마
 */
export const sendNotificationInputSchema = z.object({
  target_type: targetTypeSchema,
  target_id: targetIdSchema,
  message: messageSchema,
  confirm: confirmSchema,
});

/**
 * schedule_notification 입력 스키마
 */
export const scheduleNotificationInputSchema = z.object({
  target_type: targetTypeSchema,
  target_id: targetIdSchema,
  message: messageSchema,
  execute_at: futureDateTimeSchema.describe('실행 시점 (ISO8601, 미래 시점만)'),
  idempotency_key: idempotencyKeySchema,
  confirm: confirmSchema,
});

/**
 * summarize_and_execute 입력 스키마
 */
export const summarizeAndExecuteInputSchema = z.object({
  summary_text: z
    .string()
    .min(1, '요약 텍스트는 필수입니다')
    .max(2000, '요약 텍스트는 2000자를 초과할 수 없습니다')
    .describe('LLM이 생성한 요약 텍스트'),
  target_type: targetTypeSchema,
  target_id: targetIdSchema,
  confirm: confirmSchema,
});

/**
 * create_event 입력 스키마
 */
export const createEventInputSchema = z
  .object({
    title: eventTitleSchema,
    start_at: isoDateTimeSchema.describe('시작 시간 (ISO8601)'),
    end_at: isoDateTimeSchema.describe('종료 시간 (ISO8601)'),
    description: eventDescriptionSchema,
    confirm: confirmSchema,
  })
  .refine(
    (data) => {
      const start = new Date(data.start_at);
      const end = new Date(data.end_at);
      return end > start;
    },
    { message: '종료 시간은 시작 시간 이후여야 합니다', path: ['end_at'] }
  )
  .refine(
    (data) => {
      const start = new Date(data.start_at);
      return start > new Date();
    },
    { message: '시작 시간은 미래 시점이어야 합니다', path: ['start_at'] }
  )
  .refine(
    (data) => {
      const start = new Date(data.start_at);
      const end = new Date(data.end_at);
      const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7일
      return end.getTime() - start.getTime() <= maxDuration;
    },
    { message: '일정 기간은 7일을 초과할 수 없습니다', path: ['end_at'] }
  );

/**
 * Zod 스키마 타입 추출
 */
export type SendNotificationInput = z.infer<typeof sendNotificationInputSchema>;
export type ScheduleNotificationInput = z.infer<typeof scheduleNotificationInputSchema>;
export type SummarizeAndExecuteInput = z.infer<typeof summarizeAndExecuteInputSchema>;
export type CreateEventInput = z.infer<typeof createEventInputSchema>;
