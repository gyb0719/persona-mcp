import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  listCharacters,
  createCharacter,
  getCharacter,
  startRoleplay,
  continueRoleplay,
} from '../tools/index.js';
import { logger } from '../core/logger.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'persona-mcp',
    version: '1.0.0',
  });

  server.tool(
    'list_characters',
    `캐릭터 목록을 조회합니다.

기본 제공 템플릿 10종:
🧛 드라큘라 백작 | 🦊 구미호 | 👻 도깨비
👑 회귀한 황태자 | 😈 악녀로 빙의
🔍 셜록 홈즈 | 🏹 의적 로빈
⚡ 하데스 | 🎭 로키
💜 내 마음의 상담사`,
    {
      userId: z.string().describe('사용자 ID'),
    },
    async ({ userId }) => {
      const result = await listCharacters({ userId });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'create_character',
    `새 캐릭터를 생성합니다.

**템플릿 사용**: templateId로 선택 (dracula, gumiho, regressed-prince, villainess, sherlock, dokkaebi, hades, loki, counselor, robin)
**커스텀 생성**: name, personality 필수`,
    {
      userId: z.string().describe('사용자 ID'),
      templateId: z.string().optional().describe('템플릿 ID'),
      customName: z.string().optional().describe('템플릿 사용 시 이름 변경'),
      name: z.string().optional().describe('커스텀 캐릭터 이름'),
      description: z.string().optional().describe('외모/배경 설명'),
      personality: z.string().optional().describe('성격/말투 설정'),
      scenario: z.string().optional().describe('상황 설정 (세계관 포함)'),
      firstMessage: z.string().optional().describe('첫 인사 메시지'),
      exampleDialogue: z.string().optional().describe('예시 대화'),
    },
    async (params) => {
      const result = await createCharacter(params);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'get_character',
    '캐릭터의 상세 정보를 조회합니다.',
    {
      userId: z.string().describe('사용자 ID'),
      characterId: z.string().describe('캐릭터 ID'),
    },
    async ({ userId, characterId }) => {
      const result = await getCharacter({ userId, characterId });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'start_roleplay',
    `선택한 캐릭터와 롤플레이를 시작합니다.

캐릭터의 첫 인사와 함께 롤플레이용 컨텍스트(시스템 프롬프트)를 반환합니다.`,
    {
      userId: z.string().describe('사용자 ID'),
      characterId: z.string().describe('캐릭터 ID'),
    },
    async ({ userId, characterId }) => {
      const result = await startRoleplay({ userId, characterId });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'continue_roleplay',
    `롤플레이를 계속합니다.

대화에서 중요한 정보를 자동으로 추출하여 기억합니다.
업데이트된 컨텍스트(시스템 프롬프트 + 메모리 + 최근 대화)를 반환합니다.`,
    {
      userId: z.string().describe('사용자 ID'),
      sessionId: z.string().describe('세션 ID'),
      userMessage: z.string().describe('사용자가 보낸 메시지'),
      aiResponse: z.string().optional().describe('AI가 생성한 응답 (메모리 추출용)'),
    },
    async ({ userId, sessionId, userMessage, aiResponse }) => {
      const result = await continueRoleplay({ userId, sessionId, userMessage, aiResponse });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  logger.info('MCP Server initialized', { toolCount: 5 });

  return server;
}
