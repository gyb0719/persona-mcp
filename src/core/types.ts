export interface Character {
  id: string;
  userId: string;
  name: string;
  description: string;
  personality: string;
  scenario?: string;
  firstMessage: string;
  exampleDialogue?: string;
  createdAt: string;
  templateId?: string;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  emoji: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleDialogue: string;
}

export type TemplateCategory =
  | 'supernatural'
  | 'regression'
  | 'mystery'
  | 'mythology'
  | 'healing';

export interface Memory {
  id: string;
  sessionId: string;
  key: string;
  value: string;
  importance: number;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  characterId: string;
  character: Character;
  memories: Memory[];
  conversationHistory: ConversationTurn[];
  startedAt: string;
  lastActiveAt: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ListCharactersInput {
  userId: string;
}

export interface ListCharactersOutput {
  templates: TemplatePreview[];
  characters: Character[];
  timestamp: string;
}

export interface TemplatePreview {
  id: string;
  name: string;
  emoji: string;
  category: TemplateCategory;
  preview: string;
}

export interface CreateCharacterInput {
  userId: string;
  templateId?: string;
  customName?: string;
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  firstMessage?: string;
  exampleDialogue?: string;
}

export interface CreateCharacterOutput {
  status: 'created' | 'failed';
  characterId?: string;
  character?: Character;
  error?: string;
  timestamp: string;
}

export interface GetCharacterInput {
  userId: string;
  characterId: string;
}

export interface GetCharacterOutput {
  status: 'found' | 'not_found';
  character?: Character;
  timestamp: string;
}

export interface StartRoleplayInput {
  userId: string;
  characterId: string;
}

export interface StartRoleplayOutput {
  status: 'started' | 'failed';
  sessionId?: string;
  greeting?: string;
  context?: RoleplayContext;
  error?: string;
  timestamp: string;
}

export interface ContinueRoleplayInput {
  userId: string;
  sessionId: string;
  userMessage: string;
  aiResponse?: string;
}

export interface ContinueRoleplayOutput {
  status: 'continued' | 'failed';
  context?: RoleplayContext;
  extractedMemory?: string;
  error?: string;
  timestamp: string;
}

export interface RoleplayContext {
  character: Character;
  memories: Memory[];
  systemPrompt: string;
  recentHistory: ConversationTurn[];
}
