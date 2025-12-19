import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { CreateCharacterInput, CreateCharacterOutput, Character } from '../core/types.js';
import { TemplateNotFoundError, InvalidInputError } from '../core/errors.js';
import { storage } from '../storage/index.js';
import { getTemplateById } from '../templates/index.js';

export const createCharacterSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  templateId: z.string().optional(),
  customName: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  firstMessage: z.string().optional(),
  exampleDialogue: z.string().optional(),
});

export async function createCharacter(
  input: CreateCharacterInput
): Promise<CreateCharacterOutput> {
  const timestamp = new Date().toISOString();

  try {
    let character: Character;

    if (input.templateId) {
      const template = getTemplateById(input.templateId);
      if (!template) {
        throw new TemplateNotFoundError(input.templateId);
      }

      character = {
        id: uuidv4(),
        userId: input.userId,
        name: input.customName || template.name,
        description: template.description,
        personality: template.personality,
        scenario: template.scenario,
        firstMessage: template.firstMessage,
        exampleDialogue: template.exampleDialogue,
        createdAt: timestamp,
        templateId: template.id,
      };
    } else {
      if (!input.name || !input.personality) {
        throw new InvalidInputError(
          '커스텀 캐릭터 생성 시 name과 personality는 필수입니다.'
        );
      }

      character = {
        id: uuidv4(),
        userId: input.userId,
        name: input.name,
        description: input.description || '',
        personality: input.personality,
        scenario: input.scenario,
        firstMessage: input.firstMessage || `*${input.name}이(가) 당신을 바라봅니다.*`,
        exampleDialogue: input.exampleDialogue,
        createdAt: timestamp,
      };
    }

    await storage.saveCharacter(character);

    return {
      status: 'created',
      characterId: character.id,
      character,
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

export const createCharacterTool = {
  name: 'create_character',
  description: `새 캐릭터를 생성합니다.

**방법 1: 템플릿 사용**
- templateId로 기본 템플릿 선택
- customName으로 이름만 변경 가능

사용 가능한 템플릿:
- dracula: 드라큘라 백작
- gumiho: 구미호
- regressed-prince: 회귀한 황태자
- villainess: 악녀로 빙의
- sherlock: 셜록 홈즈
- dokkaebi: 도깨비
- hades: 하데스
- loki: 로키
- counselor: 내 마음의 상담사
- robin: 의적 로빈

**방법 2: 커스텀 생성**
- name, personality 필수
- description, scenario, firstMessage, exampleDialogue 선택`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      userId: {
        type: 'string',
        description: '사용자 ID',
      },
      templateId: {
        type: 'string',
        description: '템플릿 ID (dracula, gumiho, regressed-prince 등)',
      },
      customName: {
        type: 'string',
        description: '템플릿 사용 시 이름만 변경',
      },
      name: {
        type: 'string',
        description: '커스텀 캐릭터 이름',
      },
      description: {
        type: 'string',
        description: '캐릭터 외모/배경 설명',
      },
      personality: {
        type: 'string',
        description: '성격/말투 설정',
      },
      scenario: {
        type: 'string',
        description: '상황 설정 (세계관 포함)',
      },
      firstMessage: {
        type: 'string',
        description: '첫 인사 메시지',
      },
      exampleDialogue: {
        type: 'string',
        description: '예시 대화',
      },
    },
    required: ['userId'],
  },
  handler: createCharacter,
  zodSchema: createCharacterSchema,
};
