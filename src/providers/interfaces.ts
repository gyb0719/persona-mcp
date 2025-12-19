import type { ExecutionResult, NotificationRequest, EventRequest } from '../core/types.js';

/**
 * 알림 Provider 인터페이스
 *
 * 실제 알림 서비스 연동 시 이 인터페이스를 구현합니다.
 */
export interface INotificationProvider {
  /**
   * 알림 전송
   */
  send(request: NotificationRequest): Promise<ExecutionResult>;

  /**
   * 대상 유효성 검증
   */
  validateTarget(targetType: string, targetId: string): Promise<boolean>;
}

/**
 * 캘린더 Provider 인터페이스
 *
 * 실제 캘린더 서비스 연동 시 이 인터페이스를 구현합니다.
 */
export interface ICalendarProvider {
  /**
   * 일정 생성
   */
  createEvent(request: EventRequest): Promise<ExecutionResult>;

  /**
   * 일정 충돌 확인
   */
  checkConflict(startAt: string, endAt: string): Promise<boolean>;
}

/**
 * Provider Factory 인터페이스
 *
 * Provider 인스턴스를 생성하고 관리합니다.
 */
export interface IProviderFactory {
  /**
   * 알림 Provider 획득
   */
  getNotificationProvider(): INotificationProvider;

  /**
   * 캘린더 Provider 획득
   */
  getCalendarProvider(): ICalendarProvider;
}
