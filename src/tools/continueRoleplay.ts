import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type {
  ContinueRoleplayInput,
  ContinueRoleplayOutput,
  Memory,
  RoleplayContext,
  ConversationTurn,
} from '../core/types.js';
import { storage } from '../storage/index.js';

export const continueRoleplaySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  sessionId: z.string().min(1, 'sessionId is required'),
  userMessage: z.string().min(1, 'userMessage is required'),
  aiResponse: z.string().optional(),
});

const MEMORY_KEYWORDS = [
  '이름', '나이', '직업', '취미', '좋아하', '싫어하', '생일', '사는 곳',
  '가족', '친구', '연인', '약속', '기억', '추억', '비밀', '소원',
];

function extractMemory(message: string, response?: string): Memory | null {
  const combined = `${message} ${response || ''}`;

  for (const keyword of MEMORY_KEYWORDS) {
    if (combined.includes(keyword)) {
      const patterns = [
        /(?:내|제)\s*이름은?\s*(.+?)(?:야|이야|예요|입니다|이에요)/,
        /(?:나는?|저는?)\s*(.+?)\s*(?:좋아해|싫어해|사랑해)/,
        /(?:생일은?|생일이)\s*(.+?)(?:야|이야|예요|입니다)/,
        /(?:나이는?|나이가)\s*(\d+)\s*살/,
        /(.+?)(?:라고|이라고)\s*(?:불러|해)/,
      ];

      for (const pattern of patterns) {
        const match = combined.match(pattern);
        if (match) {
          return {
            id: uuidv4(),
            sessionId: '',
            key: keyword,
            value: match[1].trim(),
            importance: 0.8,
            createdAt: new Date().toISOString(),
          };
        }
      }

      return {
        id: uuidv4(),
        sessionId: '',
        key: keyword,
        value: combined.slice(0, 100),
        importance: 0.5,
        createdAt: new Date().toISOString(),
      };
    }
  }

  return null;
}

function generateSystemPrompt(
  characterName: string,
  personality: string,
  scenario: string | undefined,
  memories: Memory[]
): string {
  let prompt = `당신은 "${characterName}"입니다. 아래 설정에 따라 롤플레이를 진행하세요.

## 캐릭터 성격 및 말투
${personality}
`;

  if (scenario) {
    prompt += `
## 상황 설정
${scenario}
`;
  }

  if (memories.length > 0) {
    prompt += `
## 기억하고 있는 정보
`;
    for (const memory of memories) {
      prompt += `- ${memory.key}: ${memory.value}\n`;
    }
  }

  prompt += `
## 롤플레이 규칙
1. 항상 캐릭터의 성격과 말투를 유지하세요.
2. *액션*이나 (생각) 등을 활용해 생동감 있게 표현하세요.
3. 사용자의 반응에 자연스럽게 대응하세요.
4. 기억하고 있는 정보를 대화에 자연스럽게 반영하세요.
`;

  return prompt;
}

export async function continueRoleplay(
  input: ContinueRoleplayInput
): Promise<ContinueRoleplayOutput> {
  const timestamp = new Date().toISOString();

  try {
    const session = await storage.getSession(input.sessionId);

    if (!session || session.userId !== input.userId) {
      return {
        status: 'failed',
        error: `Session not found: ${input.sessionId}`,
        timestamp,
      };
    }

    const userTurn: ConversationTurn = {
      role: 'user',
      content: input.userMessage,
      timestamp,
    };
    session.conversationHistory.push(userTurn);

    if (input.aiResponse) {
      const assistantTurn: ConversationTurn = {
        role: 'assistant',
        content: input.aiResponse,
        timestamp,
      };
      session.conversationHistory.push(assistantTurn);
    }

    const extractedMemory = extractMemory(input.userMessage, input.aiResponse);
    let extractedMemoryText: string | undefined;

    if (extractedMemory) {
      extractedMemory.sessionId = session.id;
      await storage.saveMemory(extractedMemory);
      session.memories.push(extractedMemory);
      extractedMemoryText = `${extractedMemory.key}: ${extractedMemory.value}`;
    }

    const MAX_HISTORY = 20;
    const recentHistory = session.conversationHistory.slice(-MAX_HISTORY);

    session.lastActiveAt = timestamp;
    await storage.updateSession(session);

    const systemPrompt = generateSystemPrompt(
      session.character.name,
      session.character.personality,
      session.character.scenario,
      session.memories
    );

    const context: RoleplayContext = {
      character: session.character,
      memories: session.memories,
      systemPrompt,
      recentHistory,
    };

    return {
      status: 'continued',
      context,
      extractedMemory: extractedMemoryText,
      timestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 'failed',
      error: errorMessage,
      timestamp,
    };
  }
}

export const continueRoleplayTool = {
  name: 'continue_roleplay',
  description: `롤플레이를 계속합니다.

사용자 메시지를 저장하고, AI 응답이 있으면 함께 저장합니다.
대화에서 중요한 정보(이름, 취미, 약속 등)를 자동으로 추출하여 기억합니다.

업데이트된 컨텍스트(시스템 프롬프트 + 메모리 + 최근 대화)를 반환합니다.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      userId: {
        type: 'string',
        description: '사용자 ID',
      },
      sessionId: {
        type: 'string',
        description: '세션 ID',
      },
      userMessage: {
        type: 'string',
        description: '사용자가 보낸 메시지',
      },
      aiResponse: {
        type: 'string',
        description: 'AI가 생성한 응답 (메모리 추출용, 선택)',
      },
    },
    required: ['userId', 'sessionId', 'userMessage'],
  },
  handler: continueRoleplay,
  zodSchema: continueRoleplaySchema,
};
