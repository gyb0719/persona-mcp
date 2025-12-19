// Interfaces
export type { INotificationProvider, ICalendarProvider, IProviderFactory } from './interfaces.js';

// Mock Providers
export { MockNotificationProvider } from './mock/MockNotificationProvider.js';
export { MockCalendarProvider } from './mock/MockCalendarProvider.js';

// Provider Factory
import type { IProviderFactory, INotificationProvider, ICalendarProvider } from './interfaces.js';
import { MockNotificationProvider } from './mock/MockNotificationProvider.js';
import { MockCalendarProvider } from './mock/MockCalendarProvider.js';

/**
 * Provider Factory 구현
 *
 * 환경에 따라 적절한 Provider를 생성합니다.
 */
export class ProviderFactory implements IProviderFactory {
  private notificationProvider: INotificationProvider | null = null;
  private calendarProvider: ICalendarProvider | null = null;
  private readonly failureRate: number;

  /**
   * @param failureRate Mock Provider의 실패 확률 (0-1)
   */
  constructor(failureRate = 0.1) {
    this.failureRate = failureRate;
  }

  /**
   * 알림 Provider 획득
   */
  getNotificationProvider(): INotificationProvider {
    if (!this.notificationProvider) {
      // 환경 변수에 따라 다른 Provider 선택 가능
      // 현재는 Mock Provider만 지원
      this.notificationProvider = new MockNotificationProvider(this.failureRate);
    }
    return this.notificationProvider;
  }

  /**
   * 캘린더 Provider 획득
   */
  getCalendarProvider(): ICalendarProvider {
    if (!this.calendarProvider) {
      // 환경 변수에 따라 다른 Provider 선택 가능
      // 현재는 Mock Provider만 지원
      this.calendarProvider = new MockCalendarProvider(this.failureRate);
    }
    return this.calendarProvider;
  }

  /**
   * Provider 초기화 (테스트용)
   */
  reset(): void {
    this.notificationProvider = null;
    this.calendarProvider = null;
  }
}

/**
 * 기본 Provider Factory 인스턴스
 */
export const providerFactory = new ProviderFactory();
