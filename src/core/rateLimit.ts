import type { RateLimitConfig, RateLimitResult } from './types.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory Rate Limiter
 *
 * 슬라이딩 윈도우 방식으로 요청 수를 제한합니다.
 */
export class RateLimiter {
  private readonly limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.startCleanup();
  }

  /**
   * Rate Limit 체크 및 카운트 증가
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.limits.get(key);

    // 새로운 윈도우 시작
    if (!entry || now > entry.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    // 제한 초과
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // 카운트 증가
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * 현재 상태 조회 (카운트 증가 없음)
   */
  peek(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetAt: now + this.windowMs,
      };
    }

    return {
      allowed: entry.count < this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  /**
   * 특정 키의 제한 초기화
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * 모든 제한 초기화
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * 만료된 엔트리 정리
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * 주기적 정리 시작
   */
  private startCleanup(): void {
    // 윈도우 크기의 2배 간격으로 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs * 2);
  }

  /**
   * Rate Limiter 종료
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 현재 추적 중인 키 수
   */
  get size(): number {
    return this.limits.size;
  }
}

/**
 * 기본 Rate Limiter 인스턴스 (분당 60회)
 */
export const defaultRateLimiter = new RateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000,
});

/**
 * 스케줄용 Rate Limiter (분당 30회)
 */
export const scheduleRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
});
