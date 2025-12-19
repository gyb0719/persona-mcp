import type { INotificationProvider } from '../interfaces.js';
import type { ExecutionResult, NotificationRequest } from '../../core/types.js';
import { generateExecutionId } from '../../core/validation.js';
import { logger } from '../../core/logger.js';

/**
 * 알림 기록
 */
interface NotificationRecord {
  request: NotificationRequest;
  executionId: string;
  timestamp: Date;
}

/**
 * Mock Notification Provider
 *
 * 테스트 및 데모용 알림 Provider입니다.
 * 실제 알림은 전송하지 않고 시뮬레이션합니다.
 */
export class MockNotificationProvider implements INotificationProvider {
  private readonly sentNotifications: Map<string, NotificationRecord> = new Map();
  private readonly failureRate: number;
  private readonly log = logger.child('MockNotification');

  /**
   * @param failureRate 실패 확률 (0-1, 기본값 0.1 = 10%)
   */
  constructor(failureRate = 0.1) {
    this.failureRate = Math.max(0, Math.min(1, failureRate));
  }

  /**
   * 알림 전송
   */
  async send(request: NotificationRequest): Promise<ExecutionResult> {
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
        error: 'MOCK_DELIVERY_FAILED',
        timestamp,
      };
    }

    // 성공 시뮬레이션
    const executionId = generateExecutionId();
    const record: NotificationRecord = {
      request,
      executionId,
      timestamp: new Date(),
    };

    this.sentNotifications.set(executionId, record);

    this.log.info('Notification sent', {
      executionId,
      targetType: request.targetType,
      targetId: request.targetId,
      messageLength: request.message.length,
    });

    return {
      status: 'sent',
      executionId,
      timestamp,
    };
  }

  /**
   * 대상 유효성 검증
   *
   * Mock 구현: ID 형식만 검증
   */
  async validateTarget(targetType: string, targetId: string): Promise<boolean> {
    // 기본 형식 검증
    if (!targetId || targetId.length === 0 || targetId.length > 64) {
      return false;
    }

    // targetType 검증
    if (targetType !== 'user' && targetType !== 'group') {
      return false;
    }

    // Mock: 특정 패턴 거부 (테스트용)
    if (targetId.startsWith('invalid_')) {
      return false;
    }

    return true;
  }

  // ===== 테스트 헬퍼 메서드 =====

  /**
   * 전송된 알림 목록 조회
   */
  getSentNotifications(): Map<string, NotificationRecord> {
    return new Map(this.sentNotifications);
  }

  /**
   * 특정 알림 조회
   */
  getNotification(executionId: string): NotificationRecord | undefined {
    return this.sentNotifications.get(executionId);
  }

  /**
   * 전송된 알림 수
   */
  get sentCount(): number {
    return this.sentNotifications.size;
  }

  /**
   * 모든 기록 초기화
   */
  clear(): void {
    this.sentNotifications.clear();
    this.log.debug('Notification records cleared');
  }
}
