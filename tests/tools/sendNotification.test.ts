import { describe, it, expect, beforeEach } from 'vitest';
import { handleSendNotification } from '../../src/tools/sendNotification.js';
import { MockNotificationProvider } from '../../src/providers/mock/MockNotificationProvider.js';
import { defaultRateLimiter } from '../../src/core/rateLimit.js';

describe('send_notification Tool', () => {
  let provider: MockNotificationProvider;

  beforeEach(() => {
    provider = new MockNotificationProvider(0); // 실패 없음
    provider.clear();
    defaultRateLimiter.clear();
  });

  describe('입력 검증', () => {
    it('유효한 입력으로 성공해야 함', async () => {
      const result = await handleSendNotification(
        {
          target_type: 'user',
          target_id: 'user123',
          message: 'Hello, World!',
          confirm: true,
        },
        provider
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe('sent');
      expect(data.executionId).toBeDefined();
    });

    it('target_type이 잘못되면 실패해야 함', async () => {
      const result = await handleSendNotification(
        {
          target_type: 'invalid',
          target_id: 'user123',
          message: 'Hello',
          confirm: true,
        },
        provider
      );

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe('failed');
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('message가 비어있으면 실패해야 함', async () => {
      const result = await handleSendNotification(
        {
          target_type: 'user',
          target_id: 'user123',
          message: '',
          confirm: true,
        },
        provider
      );

      expect(result.isError).toBe(true);
    });

    it('message가 2000자를 초과하면 실패해야 함', async () => {
      const longMessage = 'a'.repeat(2001);

      const result = await handleSendNotification(
        {
          target_type: 'user',
          target_id: 'user123',
          message: longMessage,
          confirm: true,
        },
        provider
      );

      expect(result.isError).toBe(true);
    });
  });

  describe('confirm 플래그', () => {
    it('confirm=false일 때 requires_confirmation을 반환해야 함', async () => {
      const result = await handleSendNotification(
        {
          target_type: 'user',
          target_id: 'user123',
          message: 'Test message',
          confirm: false,
        },
        provider
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe('requires_confirmation');
      expect(data.executionId).toBeUndefined();
      expect(provider.sentCount).toBe(0);
    });

    it('confirm=true일 때 실제로 전송해야 함', async () => {
      const result = await handleSendNotification(
        {
          target_type: 'user',
          target_id: 'user123',
          message: 'Test message',
          confirm: true,
        },
        provider
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe('sent');
      expect(data.executionId).toBeDefined();
      expect(provider.sentCount).toBe(1);
    });
  });

  describe('대상 검증', () => {
    it('유효하지 않은 대상은 실패해야 함', async () => {
      const result = await handleSendNotification(
        {
          target_type: 'user',
          target_id: 'invalid_user',
          message: 'Test message',
          confirm: true,
        },
        provider
      );

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toBe('INVALID_TARGET');
    });
  });

  describe('Rate Limit', () => {
    it('Rate Limit 초과 시 실패해야 함', async () => {
      // 기본 Rate Limiter를 채움 (분당 60회)
      for (let i = 0; i < 60; i++) {
        defaultRateLimiter.check('notification:user123');
      }

      const result = await handleSendNotification(
        {
          target_type: 'user',
          target_id: 'user123',
          message: 'Test message',
          confirm: true,
        },
        provider
      );

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
