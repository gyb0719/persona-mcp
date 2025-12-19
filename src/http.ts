#!/usr/bin/env node

import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createMcpServer } from './server/McpServer.js';
import { ProviderFactory } from './providers/index.js';
import { logger } from './core/logger.js';

const log = logger.child('HTTP');

const app = express();
app.use(express.json());

// Provider Factory 생성
const failureRateEnv = process.env.MOCK_FAILURE_RATE;
const failureRate = failureRateEnv ? parseFloat(failureRateEnv) : 0.1;
const providerFactory = new ProviderFactory(failureRate);

// 세션별 Transport 저장소
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP POST endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  try {
    if (sessionId && transports[sessionId]) {
      // 기존 세션 재사용
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // 새 세션 초기화
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports[id] = transport;
          log.info('Session initialized', { sessionId: id });
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
          log.info('Session closed', { sessionId: transport.sessionId });
        }
      };

      // MCP Server 생성 및 연결
      const server = createMcpServer(providerFactory, {
        name: process.env.MCP_SERVER_NAME ?? 'command-execution-mcp',
        version: process.env.MCP_SERVER_VERSION ?? '1.0.0',
      });

      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid session' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    log.error('Error handling MCP request', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error' },
      id: null,
    });
  }
});

// MCP GET endpoint (SSE streaming)
app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports[sessionId];

  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(400).json({ error: 'Invalid session' });
  }
});

// MCP DELETE endpoint (세션 종료)
app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports[sessionId];

  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(400).json({ error: 'Invalid session' });
  }
});

// 서버 시작
const PORT = parseInt(process.env.PORT ?? '3000', 10);

const server = app.listen(PORT, () => {
  log.info(`MCP HTTP Server running on http://localhost:${PORT}/mcp`);
  log.info('Endpoints:');
  log.info(`  POST   http://localhost:${PORT}/mcp - MCP requests`);
  log.info(`  GET    http://localhost:${PORT}/mcp - SSE streaming`);
  log.info(`  DELETE http://localhost:${PORT}/mcp - Close session`);
  log.info(`  GET    http://localhost:${PORT}/health - Health check`);
});

// 종료 시그널 처리
const handleShutdown = (): void => {
  log.info('Shutdown signal received');
  server.close(() => {
    log.info('HTTP server closed');
    process.exit(0);
  });
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
