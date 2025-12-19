import type { Character, Session, Memory } from '../core/types.js';

export interface StorageProvider {
  // Characters
  saveCharacter(character: Character): Promise<void>;
  getCharacter(userId: string, characterId: string): Promise<Character | null>;
  getCharactersByUser(userId: string): Promise<Character[]>;
  deleteCharacter(userId: string, characterId: string): Promise<void>;

  // Sessions
  saveSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session | null>;
  getSessionsByUser(userId: string): Promise<Session[]>;
  updateSession(session: Session): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;

  // Memories
  saveMemory(memory: Memory): Promise<void>;
  getMemoriesBySession(sessionId: string): Promise<Memory[]>;
  deleteMemoriesBySession(sessionId: string): Promise<void>;
}
