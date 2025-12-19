import type { LogLevel } from './types.js';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger 설정
 */
interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
}

/**
 * 간단한 Logger 클래스
 *
 * MCP Server는 stdout을 프로토콜 통신에 사용하므로,
 * 로그는 stderr로 출력합니다.
 */
export class Logger {
  private readonly level: number;
  private readonly prefix: string;

  constructor(config: LoggerConfig) {
    this.level = LOG_LEVELS[config.level];
    this.prefix = config.prefix ?? 'MCP';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.level;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const baseMessage = `[${timestamp}] [${levelStr}] [${this.prefix}] ${message}`;

    if (data !== undefined) {
      try {
        const dataStr = JSON.stringify(data);
        return `${baseMessage} ${dataStr}`;
      } catch {
        return `${baseMessage} [Unstringifiable data]`;
      }
    }

    return baseMessage;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.error(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  /**
   * 자식 Logger 생성 (다른 prefix)
   */
  child(prefix: string): Logger {
    return new Logger({
      level: Object.entries(LOG_LEVELS).find(([_, v]) => v === this.level)?.[0] as LogLevel,
      prefix: `${this.prefix}:${prefix}`,
    });
  }
}

/**
 * 환경 변수에서 로그 레벨 읽기
 */
function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return 'info';
}

/**
 * 기본 Logger 인스턴스
 */
export const logger = new Logger({
  level: getLogLevel(),
  prefix: 'CommandExecMCP',
});
