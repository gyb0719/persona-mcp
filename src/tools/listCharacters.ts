import { z } from 'zod';
import type { ListCharactersInput, ListCharactersOutput, TemplatePreview } from '../core/types.js';
import { storage } from '../storage/index.js';
import { defaultTemplates } from '../templates/index.js';

export const listCharactersSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export async function listCharacters(
  input: ListCharactersInput
): Promise<ListCharactersOutput> {
  const templates: TemplatePreview[] = defaultTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    category: t.category,
    preview: t.firstMessage.split('\n')[0].slice(0, 50) + '...',
  }));

  const characters = await storage.getCharactersByUser(input.userId);

  return {
    templates,
    characters,
    timestamp: new Date().toISOString(),
  };
}

export const listCharactersTool = {
  name: 'list_characters',
  description: `캐릭터 목록을 조회합니다.

기본 제공 템플릿 10종:
🧛 드라큘라 백작 | 🦊 구미호 | 👻 도깨비
👑 회귀한 황태자 | 😈 악녀로 빙의
🔍 셜록 홈즈 | 🏹 의적 로빈
⚡ 하데스 | 🎭 로키
💜 내 마음의 상담사

사용자가 직접 만든 캐릭터도 함께 반환됩니다.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      userId: {
        type: 'string',
        description: '사용자 ID',
      },
    },
    required: ['userId'],
  },
  handler: listCharacters,
  zodSchema: listCharactersSchema,
};
