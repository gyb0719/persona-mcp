import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryScheduler } from '../../src/core/scheduler.js';
import { MockNotificationProvider } from '../../src/providers/mock/MockNotificationProvider.js';

describe('InMemoryScheduler', () => {
  let scheduler: InMemoryScheduler;
  let provider: MockNotificationProvider;

  beforeEach(() => {
    provider = new MockNotificationProvider(0); // 실패 없음
    scheduler = new InMemoryScheduler(100); // 100ms 간격
    scheduler.setProvider(provider);
  });

  afterEach(() => {
    scheduler.stop();
    scheduler.clear();
    provider.clear();
  });

  describe('schedule', () => {
    it('작업을 예약하고 jobId를 반환해야 함', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();

      const result = scheduler.schedule({
        targetType: 'user',
        targetId: 'user123',
        message: 'Test message',
        executeAt: futureTime,
        idempotencyKey: 'key-1',
        confirm: true,
      });

      expect(result.jobId).toBeDefined();
      expect(result.isNew).toBe(true);
      expect(scheduler.size).toBe(1);
    });

    it('동일한 idempotencyKey로 호출하면 기존 jobId를 반환해야 함', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();

      const result1 = scheduler.schedule({
        targetType: 'user',
        targetId: 'user123',
        message: 'Test message',
        executeAt: futureTime,
        idempotencyKey: 'key-1',
        confirm: true,
      });

      const result2 = scheduler.schedule({
        targetType: 'user',
        targetId: 'user123',
        message: 'Different message',
        executeAt: futureTime,
        idempotencyKey: 'key-1',
        confirm: true,
      });

      expect(result1.jobId).toBe(result2.jobId);
      expect(result2.isNew).toBe(false);
      expect(scheduler.size).toBe(1);
    });
  });

  describe('getJob', () => {
    it('예약된 작업을 조회해야 함', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();

      const { jobId } = scheduler.schedule({
        targetType: 'user',
        targetId: 'user123',
        message: 'Test message',
        executeAt: futureTime,
        idempotencyKey: 'key-1',
        confirm: true,
      });

      const job = scheduler.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.status).toBe('pending');
      expect(job?.request.message).toBe('Test message');
    });

    it('존재하지 않는 작업은 undefined를 반환해야 함', () => {
      const job = scheduler.getJob('non-existent');
      expect(job).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('대기 중인 작업을 취소해야 함', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();

      const { jobId } = scheduler.schedule({
        targetType: 'user',
        targetId: 'user123',
        message: 'Test message',
        executeAt: futureTime,
        idempotencyKey: 'key-1',
        confirm: true,
      });

      const cancelled = scheduler.cancel(jobId);

      expect(cancelled).toBe(true);
      expect(scheduler.getJob(jobId)).toBeUndefined();
    });

    it('존재하지 않는 작업 취소는 false를 반환해야 함', () => {
      const cancelled = scheduler.cancel('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('job execution', () => {
    it('예약 시간이 되면 작업을 실행해야 함', async () => {
      vi.useFakeTimers();

      const pastTime = new Date(Date.now() - 1000).toISOString();

      const { jobId } = scheduler.schedule({
        targetType: 'user',
        targetId: 'user123',
        message: 'Test message',
        executeAt: pastTime,
        idempotencyKey: 'key-1',
        confirm: true,
      });

      scheduler.start();

      await vi.advanceTimersByTimeAsync(200);

      const job = scheduler.getJob(jobId);
      expect(job?.status).toBe('executed');
      expect(provider.sentCount).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('getPendingJobs', () => {
    it('대기 중인 작업만 반환해야 함', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();

      scheduler.schedule({
        targetType: 'user',
        targetId: 'user123',
        message: 'Message 1',
        executeAt: futureTime,
        idempotencyKey: 'key-1',
        confirm: true,
      });

      scheduler.schedule({
        targetType: 'user',
        targetId: 'user456',
        message: 'Message 2',
        executeAt: futureTime,
        idempotencyKey: 'key-2',
        confirm: true,
      });

      const pendingJobs = scheduler.getPendingJobs();
      expect(pendingJobs.length).toBe(2);
    });
  });
});
