import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server/index.js';
import { logger } from './core/logger.js';

async function main(): Promise<void> {
  logger.info('Starting Persona-MCP Server (STDIO mode)');

  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  logger.info('Persona-MCP Server is running');
}

main().catch((error) => {
  logger.error('Failed to start server', { error: String(error) });
  process.exit(1);
});
