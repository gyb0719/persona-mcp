import type { ICalendarProvider } from '../interfaces.js';
import type { ExecutionResult, EventRequest } from '../../core/types.js';
import { generateEventId } from '../../core/validation.js';
import { logger } from '../../core/logger.js';

/**
 * 이벤트 기록
 */
interface EventRecord {
  request: EventRequest;
  eventId: string;
  createdAt: Date;
}

/**
 * Mock Calendar Provider
 *
 * 테스트 및 데모용 캘린더 Provider입니다.
 * 실제 캘린더에 일정을 생성하지 않고 시뮬레이션합니다.
 */
export class MockCalendarProvider implements ICalendarProvider {
  private readonly events: Map<string, EventRecord> = new Map();
  private readonly failureRate: number;
  private readonly log = logger.child('MockCalendar');

  /**
   * @param failureRate 실패 확률 (0-1, 기본값 0.1 = 10%)
   */
  constructor(failureRate = 0.1) {
    this.failureRate = Math.max(0, Math.min(1, failureRate));
  }

  /**
   * 일정 생성
   */
  async createEvent(request: EventRequest): Promise<ExecutionResult> {
    const timestamp = new Date().toISOString();

    // Dry-run 모드
    if (!request.confirm) {
      this.log.debug('Dry-run mode, returning requires_confirmation');
      return {
        status: 'requires_confirmation',
        timestamp,
      };
    }

    // 실패 시뮬레이션
    if (Math.random() < this.failureRate) {
      this.log.warn('Simulated failure');
      return {
        status: 'failed',
        error: 'MOCK_CALENDAR_ERROR',
        timestamp,
      };
    }

    // 충돌 체크 (Mock 구현)
    const hasConflict = await this.checkConflict(request.startAt, request.endAt);
    if (hasConflict) {
      this.log.warn('Schedule conflict detected');
      return {
        status: 'failed',
        error: 'SCHEDULE_CONFLICT',
        timestamp,
      };
    }

    // 성공 시뮬레이션
    const eventId = generateEventId();
    const record: EventRecord = {
      request,
      eventId,
      createdAt: new Date(),
    };

    this.events.set(eventId, record);

    this.log.info('Event created', {
      eventId,
      title: request.title,
      startAt: request.startAt,
      endAt: request.endAt,
    });

    return {
      status: 'created',
      eventId,
      timestamp,
    };
  }

  /**
   * 일정 충돌 확인
   *
   * Mock 구현: 기존 일정과 시간이 겹치는지 확인
   */
  async checkConflict(startAt: string, endAt: string): Promise<boolean> {
    const newStart = new Date(startAt);
    const newEnd = new Date(endAt);

    for (const record of this.events.values()) {
      const existingStart = new Date(record.request.startAt);
      const existingEnd = new Date(record.request.endAt);

      // 시간 겹침 확인
      if (newStart < existingEnd && newEnd > existingStart) {
        return true;
      }
    }

    return false;
  }

  // ===== 테스트 헬퍼 메서드 =====

  /**
   * 생성된 이벤트 목록 조회
   */
  getEvents(): Map<string, EventRecord> {
    return new Map(this.events);
  }

  /**
   * 특정 이벤트 조회
   */
  getEvent(eventId: string): EventRecord | undefined {
    return this.events.get(eventId);
  }

  /**
   * 이벤트 삭제
   */
  deleteEvent(eventId: string): boolean {
    return this.events.delete(eventId);
  }

  /**
   * 생성된 이벤트 수
   */
  get eventCount(): number {
    return this.events.size;
  }

  /**
   * 모든 기록 초기화
   */
  clear(): void {
    this.events.clear();
    this.log.debug('Event records cleared');
  }
}
