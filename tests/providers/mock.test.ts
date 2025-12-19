import { describe, it, expect, beforeEach } from 'vitest';
import { MockNotificationProvider } from '../../src/providers/mock/MockNotificationProvider.js';
import { MockCalendarProvider } from '../../src/providers/mock/MockCalendarProvider.js';

describe('MockNotificationProvider', () => {
  let provider: MockNotificationProvider;

  beforeEach(() => {
    provider = new MockNotificationProvider(0); // 실패 없음
    provider.clear();
  });

  describe('send', () => {
    it('confirm=true일 때 알림을 전송해야 함', async () => {
      const result = await provider.send({
        targetType: 'user',
        targetId: 'user123',
        message: 'Test message',
        confirm: true,
      });

      expect(result.status).toBe('sent');
      expect(result.executionId).toBeDefined();
      expect(provider.sentCount).toBe(1);
    });

    it('confirm=false일 때 requires_confirmation을 반환해야 함', async () => {
      const result = await provider.send({
        targetType: 'user',
        targetId: 'user123',
        message: 'Test message',
        confirm: false,
      });

      expect(result.status).toBe('requires_confirmation');
      expect(result.executionId).toBeUndefined();
      expect(provider.sentCount).toBe(0);
    });

    it('실패율 설정에 따라 실패할 수 있어야 함', async () => {
      const failingProvider = new MockNotificationProvider(1); // 100% 실패

      const result = await failingProvider.send({
        targetType: 'user',
        targetId: 'user123',
        message: 'Test message',
        confirm: true,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('MOCK_DELIVERY_FAILED');
    });
  });

  describe('validateTarget', () => {
    it('유효한 대상을 검증해야 함', async () => {
      expect(await provider.validateTarget('user', 'user123')).toBe(true);
      expect(await provider.validateTarget('group', 'group456')).toBe(true);
    });

    it('빈 ID는 거부해야 함', async () => {
      expect(await provider.validateTarget('user', '')).toBe(false);
    });

    it('너무 긴 ID는 거부해야 함', async () => {
      const longId = 'a'.repeat(65);
      expect(await provider.validateTarget('user', longId)).toBe(false);
    });

    it('invalid_ 접두사가 있는 ID는 거부해야 함', async () => {
      expect(await provider.validateTarget('user', 'invalid_user')).toBe(false);
    });

    it('잘못된 대상 유형은 거부해야 함', async () => {
      expect(await provider.validateTarget('invalid', 'user123')).toBe(false);
    });
  });
});

describe('MockCalendarProvider', () => {
  let provider: MockCalendarProvider;

  beforeEach(() => {
    provider = new MockCalendarProvider(0); // 실패 없음
    provider.clear();
  });

  describe('createEvent', () => {
    it('confirm=true일 때 이벤트를 생성해야 함', async () => {
      const startAt = new Date(Date.now() + 3600000).toISOString(); // 1시간 후
      const endAt = new Date(Date.now() + 7200000).toISOString(); // 2시간 후

      const result = await provider.createEvent({
        title: 'Test Event',
        startAt,
        endAt,
        confirm: true,
      });

      expect(result.status).toBe('created');
      expect(result.eventId).toBeDefined();
      expect(provider.eventCount).toBe(1);
    });

    it('confirm=false일 때 requires_confirmation을 반환해야 함', async () => {
      const startAt = new Date(Date.now() + 3600000).toISOString();
      const endAt = new Date(Date.now() + 7200000).toISOString();

      const result = await provider.createEvent({
        title: 'Test Event',
        startAt,
        endAt,
        confirm: false,
      });

      expect(result.status).toBe('requires_confirmation');
      expect(result.eventId).toBeUndefined();
      expect(provider.eventCount).toBe(0);
    });

    it('설명이 포함된 이벤트를 생성해야 함', async () => {
      const startAt = new Date(Date.now() + 3600000).toISOString();
      const endAt = new Date(Date.now() + 7200000).toISOString();

      const result = await provider.createEvent({
        title: 'Test Event',
        startAt,
        endAt,
        description: 'This is a test event',
        confirm: true,
      });

      expect(result.status).toBe('created');

      const event = provider.getEvent(result.eventId!);
      expect(event?.request.description).toBe('This is a test event');
    });
  });

  describe('checkConflict', () => {
    it('시간이 겹치는 이벤트가 있으면 true를 반환해야 함', async () => {
      const startAt1 = new Date(Date.now() + 3600000).toISOString();
      const endAt1 = new Date(Date.now() + 7200000).toISOString();

      await provider.createEvent({
        title: 'Existing Event',
        startAt: startAt1,
        endAt: endAt1,
        confirm: true,
      });

      // 겹치는 시간
      const startAt2 = new Date(Date.now() + 5400000).toISOString(); // 기존 이벤트 중간
      const endAt2 = new Date(Date.now() + 9000000).toISOString();

      const hasConflict = await provider.checkConflict(startAt2, endAt2);
      expect(hasConflict).toBe(true);
    });

    it('시간이 겹치지 않으면 false를 반환해야 함', async () => {
      const startAt1 = new Date(Date.now() + 3600000).toISOString();
      const endAt1 = new Date(Date.now() + 7200000).toISOString();

      await provider.createEvent({
        title: 'Existing Event',
        startAt: startAt1,
        endAt: endAt1,
        confirm: true,
      });

      // 겹치지 않는 시간
      const startAt2 = new Date(Date.now() + 10800000).toISOString(); // 기존 이벤트 이후
      const endAt2 = new Date(Date.now() + 14400000).toISOString();

      const hasConflict = await provider.checkConflict(startAt2, endAt2);
      expect(hasConflict).toBe(false);
    });
  });

  describe('deleteEvent', () => {
    it('이벤트를 삭제해야 함', async () => {
      const startAt = new Date(Date.now() + 3600000).toISOString();
      const endAt = new Date(Date.now() + 7200000).toISOString();

      const result = await provider.createEvent({
        title: 'Test Event',
        startAt,
        endAt,
        confirm: true,
      });

      expect(provider.eventCount).toBe(1);

      const deleted = provider.deleteEvent(result.eventId!);
      expect(deleted).toBe(true);
      expect(provider.eventCount).toBe(0);
    });
  });
});
