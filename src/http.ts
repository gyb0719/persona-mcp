import express from 'express';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server/index.js';
import { logger } from './core/logger.js';
import { storage, InMemoryStorage } from './storage/index.js';

const app = express();
app.use(express.json());

// Accept 헤더 자동 추가 미들웨어 (PlayMCP 호환)
app.use('/mcp', (req, _res, next) => {
  if (!req.headers.accept || !req.headers.accept.includes('text/event-stream')) {
    req.headers.accept = 'application/json, text/event-stream';
  }
  next();
});

const sessions = new Map<string, StreamableHTTPServerTransport>();

app.get('/health', (_req, res) => {
  const stats = (storage as InMemoryStorage).getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats,
  });
});

app.post('/mcp', async (req, res) => {
  // PlayMCP 호환: Accept 헤더 강제 설정
  req.headers['accept'] = 'application/json, text/event-stream';
  (req as unknown as { rawHeaders: string[] }).rawHeaders =
    (req as unknown as { rawHeaders: string[] }).rawHeaders.filter((_, i, arr) =>
      arr[i - 1]?.toLowerCase() !== 'accept'
    );
  (req as unknown as { rawHeaders: string[] }).rawHeaders.push('Accept', 'application/json, text/event-stream');

  try {
    const sessionId = req.headers['x-session-id'] as string || randomUUID();

    let transport = sessions.get(sessionId);

    if (!transport) {
      const server = createMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
        enableJsonResponse: true,
        onsessioninitialized: (id) => {
          logger.info('Session initialized', { sessionId: id });
        },
      });

      await server.connect(transport);
      sessions.set(sessionId, transport);

      logger.info('New session created', { sessionId });
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('HTTP request failed', { error: errorMessage });
    res.status(500).json({
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['x-session-id'] as string;

  if (!sessionId) {
    res.status(400).json({ error: 'x-session-id header required for GET' });
    return;
  }

  const transport = sessions.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await transport.handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['x-session-id'] as string;

  if (!sessionId) {
    res.status(400).json({ error: 'x-session-id header required' });
    return;
  }

  const transport = sessions.get(sessionId);
  if (transport) {
    await transport.close();
    sessions.delete(sessionId);
    logger.info('Session closed', { sessionId });
  }

  res.json({
    status: 'closed',
    sessionId,
    timestamp: new Date().toISOString(),
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Persona-MCP HTTP Server running on port ${PORT}`);
  logger.info('Endpoints:');
  logger.info('  GET  /health - Health check');
  logger.info('  POST /mcp    - MCP requests');
  logger.info('  GET  /mcp    - SSE streaming');
  logger.info('  DELETE /mcp  - Close session');
});
