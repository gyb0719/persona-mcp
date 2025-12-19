import { z } from 'zod';
import type { GetCharacterInput, GetCharacterOutput } from '../core/types.js';
import { storage } from '../storage/index.js';

export const getCharacterSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  characterId: z.string().min(1, 'characterId is required'),
});

export async function getCharacter(
  input: GetCharacterInput
): Promise<GetCharacterOutput> {
  const character = await storage.getCharacter(input.userId, input.characterId);

  if (!character) {
    return {
      status: 'not_found',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    status: 'found',
    character,
    timestamp: new Date().toISOString(),
  };
}

export const getCharacterTool = {
  name: 'get_character',
  description: '캐릭터의 상세 정보를 조회합니다.',
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
  handler: getCharacter,
  zodSchema: getCharacterSchema,
};
