import type { ScheduledJob, ScheduleRequest } from './types.js';
import type { INotificationProvider } from '../providers/interfaces.js';
import { generateJobId } from './validation.js';
import { logger } from './logger.js';

/**
 * In-Memory Job Scheduler
 *
 * 예약된 알림을 관리하고 실행합니다.
 */
export class InMemoryScheduler {
  private readonly jobs: Map<string, ScheduledJob> = new Map();
  private readonly idempotencyIndex: Map<string, string> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private provider: INotificationProvider | null = null;
  private readonly checkIntervalMs: number;
  private readonly log = logger.child('Scheduler');

  constructor(checkIntervalMs = 1000) {
    this.checkIntervalMs = checkIntervalMs;
  }

  /**
   * Provider 설정
   */
  setProvider(provider: INotificationProvider): void {
    this.provider = provider;
  }

  /**
   * 작업 예약
   */
  schedule(request: ScheduleRequest): { jobId: string; isNew: boolean } {
    // 중복 체크 (idempotencyKey 기반)
    const existingJobId = this.idempotencyIndex.get(request.idempotencyKey);
    if (existingJobId) {
      this.log.info('Duplicate schedule detected', { idempotencyKey: request.idempotencyKey });
      return { jobId: existingJobId, isNew: false };
    }

    const jobId = generateJobId();
    const job: ScheduledJob = {
      id: jobId,
      idempotencyKey: request.idempotencyKey,
      executeAt: new Date(request.executeAt),
      request: {
        targetType: request.targetType,
        targetId: request.targetId,
        message: request.message,
        confirm: true, // 스케줄러는 항상 실행 모드
      },
      status: 'pending',
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.idempotencyIndex.set(request.idempotencyKey, jobId);
    this.ensureTimerRunning();

    this.log.info('Job scheduled', { jobId, executeAt: request.executeAt });
    return { jobId, isNew: true };
  }

  /**
   * 작업 조회
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 작업 취소
   */
  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return false;
    }

    this.jobs.delete(jobId);
    this.idempotencyIndex.delete(job.idempotencyKey);
    this.log.info('Job cancelled', { jobId });
    return true;
  }

  /**
   * 모든 대기 중인 작업 조회
   */
  getPendingJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).filter((job) => job.status === 'pending');
  }

  /**
   * 타이머 시작
   */
  private ensureTimerRunning(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      void this.processJobs();
    }, this.checkIntervalMs);

    this.log.debug('Scheduler timer started');
  }

  /**
   * 대기 중인 작업 처리
   */
  private async processJobs(): Promise<void> {
    if (!this.provider) {
      this.log.warn('Provider not set, skipping job processing');
      return;
    }

    const now = new Date();

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status !== 'pending') continue;
      if (job.executeAt > now) continue;

      this.log.info('Executing scheduled job', { jobId });

      try {
        const result = await this.provider.send(job.request);

        if (result.status === 'sent') {
          job.status = 'executed';
          job.executedAt = new Date();
          this.log.info('Job executed successfully', { jobId, executionId: result.executionId });
        } else {
          job.status = 'failed';
          job.error = result.error ?? 'Unknown error';
          this.log.error('Job execution failed', { jobId, error: job.error });
        }
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        this.log.error('Job execution error', { jobId, error: job.error });
      }
    }
  }

  /**
   * 스케줄러 시작
   */
  start(): void {
    this.ensureTimerRunning();
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.log.debug('Scheduler timer stopped');
    }
  }

  /**
   * 모든 데이터 초기화
   */
  clear(): void {
    this.jobs.clear();
    this.idempotencyIndex.clear();
    this.log.debug('Scheduler cleared');
  }

  /**
   * 등록된 작업 수
   */
  get size(): number {
    return this.jobs.size;
  }

  /**
   * 대기 중인 작업 수
   */
  get pendingCount(): number {
    return this.getPendingJobs().length;
  }
}

/**
 * 기본 스케줄러 인스턴스
 */
export const scheduler = new InMemoryScheduler();
