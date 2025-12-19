import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../../src/core/rateLimit.js';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000,
    });
  });

  afterEach(() => {
    rateLimiter.stop();
  });

  describe('check', () => {
    it('첫 번째 요청은 허용되어야 함', () => {
      const result = rateLimiter.check('test-key');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('maxRequests까지 요청을 허용해야 함', () => {
      rateLimiter.check('test-key');
      rateLimiter.check('test-key');
      const result = rateLimiter.check('test-key');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('maxRequests 초과 시 요청을 거부해야 함', () => {
      rateLimiter.check('test-key');
      rateLimiter.check('test-key');
      rateLimiter.check('test-key');
      const result = rateLimiter.check('test-key');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('다른 키는 독립적으로 제한해야 함', () => {
      rateLimiter.check('key-a');
      rateLimiter.check('key-a');
      rateLimiter.check('key-a');

      const resultA = rateLimiter.check('key-a');
      const resultB = rateLimiter.check('key-b');

      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
    });

    it('윈도우 시간이 지나면 제한이 초기화되어야 함', () => {
      vi.useFakeTimers();

      rateLimiter.check('test-key');
      rateLimiter.check('test-key');
      rateLimiter.check('test-key');

      expect(rateLimiter.check('test-key').allowed).toBe(false);

      vi.advanceTimersByTime(1100);

      expect(rateLimiter.check('test-key').allowed).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('peek', () => {
    it('카운트를 증가시키지 않고 상태를 조회해야 함', () => {
      rateLimiter.check('test-key');

      const peek1 = rateLimiter.peek('test-key');
      const peek2 = rateLimiter.peek('test-key');

      expect(peek1.remaining).toBe(2);
      expect(peek2.remaining).toBe(2);
    });
  });

  describe('reset', () => {
    it('특정 키의 제한을 초기화해야 함', () => {
      rateLimiter.check('test-key');
      rateLimiter.check('test-key');
      rateLimiter.check('test-key');

      expect(rateLimiter.check('test-key').allowed).toBe(false);

      rateLimiter.reset('test-key');

      expect(rateLimiter.check('test-key').allowed).toBe(true);
    });
  });

  describe('clear', () => {
    it('모든 제한을 초기화해야 함', () => {
      rateLimiter.check('key-a');
      rateLimiter.check('key-b');

      expect(rateLimiter.size).toBe(2);

      rateLimiter.clear();

      expect(rateLimiter.size).toBe(0);
    });
  });
});
