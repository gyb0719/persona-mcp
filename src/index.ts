#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server/McpServer.js';
import { ProviderFactory } from './providers/index.js';
import { logger } from './core/logger.js';

const log = logger.child('Main');

/**
 * 메인 진입점 (STDIO 모드)
 */
async function main(): Promise<void> {
  try {
    log.info('Initializing Command Execution MCP Server (STDIO mode)');

    // Provider Factory 생성
    const failureRateEnv = process.env.MOCK_FAILURE_RATE;
    const failureRate = failureRateEnv ? parseFloat(failureRateEnv) : 0.1;
    const providerFactory = new ProviderFactory(failureRate);

    // MCP Server 생성
    const server = createMcpServer(providerFactory, {
      name: process.env.MCP_SERVER_NAME ?? 'command-execution-mcp',
      version: process.env.MCP_SERVER_VERSION ?? '1.0.0',
    });

    // 종료 시그널 처리
    const handleShutdown = (): void => {
      log.info('Shutdown signal received');
      process.exit(0);
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);

    // 예기치 않은 에러 처리
    process.on('uncaughtException', (error) => {
      log.error('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      log.error('Unhandled rejection', reason);
      process.exit(1);
    });

    // STDIO Transport로 서버 시작
    const transport = new StdioServerTransport();
    await server.connect(transport);

    log.info('MCP server started (STDIO mode)');
  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
}

// 실행
void main();
