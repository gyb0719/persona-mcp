import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type {
  StartRoleplayInput,
  StartRoleplayOutput,
  Session,
  RoleplayContext,
} from '../core/types.js';
import { storage } from '../storage/index.js';

export const startRoleplaySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  characterId: z.string().min(1, 'characterId is required'),
});

function generateSystemPrompt(characterName: string, personality: string, scenario?: string): string {
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

  prompt += `
## 롤플레이 규칙
1. 항상 캐릭터의 성격과 말투를 유지하세요.
2. *액션*이나 (생각) 등을 활용해 생동감 있게 표현하세요.
3. 사용자의 반응에 자연스럽게 대응하세요.
4. 캐릭터의 배경과 세계관을 일관성 있게 유지하세요.
`;

  return prompt;
}

export async function startRoleplay(
  input: StartRoleplayInput
): Promise<StartRoleplayOutput> {
  const timestamp = new Date().toISOString();

  try {
    const character = await storage.getCharacter(input.userId, input.characterId);

    if (!character) {
      return {
        status: 'failed',
        error: `Character not found: ${input.characterId}`,
        timestamp,
      };
    }

    const sessionId = uuidv4();
    const systemPrompt = generateSystemPrompt(
      character.name,
      character.personality,
      character.scenario
    );

    const session: Session = {
      id: sessionId,
      userId: input.userId,
      characterId: input.characterId,
      character,
      memories: [],
      conversationHistory: [
        {
          role: 'assistant',
          content: character.firstMessage,
          timestamp,
        },
      ],
      startedAt: timestamp,
      lastActiveAt: timestamp,
    };

    await storage.saveSession(session);

    const context: RoleplayContext = {
      character,
      memories: [],
      systemPrompt,
      recentHistory: session.conversationHistory,
    };

    return {
      status: 'started',
      sessionId,
      greeting: character.firstMessage,
      context,
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

export const startRoleplayTool = {
  name: 'start_roleplay',
  description: `선택한 캐릭터와 롤플레이를 시작합니다.

캐릭터의 첫 인사와 함께 롤플레이용 컨텍스트(시스템 프롬프트)를 반환합니다.
반환된 systemPrompt를 LLM에 전달하면 캐릭터가 설정대로 대화합니다.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      userId: {
        type: 'string',
        description: '사용자 ID',
      },
      characterId: {
        type: 'string',
        description: '캐릭터 ID',
      },
    },
    required: ['userId', 'characterId'],
  },
  handler: startRoleplay,
  zodSchema: startRoleplaySchema,
};
