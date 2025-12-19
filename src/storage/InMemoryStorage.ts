import type { Character, Session, Memory } from '../core/types.js';
import type { StorageProvider } from './interfaces.js';

export class InMemoryStorage implements StorageProvider {
  private characters: Map<string, Character> = new Map();
  private sessions: Map<string, Session> = new Map();
  private memories: Map<string, Memory[]> = new Map();

  private getCharacterKey(userId: string, characterId: string): string {
    return `${userId}:${characterId}`;
  }

  async saveCharacter(character: Character): Promise<void> {
    const key = this.getCharacterKey(character.userId, character.id);
    this.characters.set(key, character);
  }

  async getCharacter(userId: string, characterId: string): Promise<Character | null> {
    const key = this.getCharacterKey(userId, characterId);
    return this.characters.get(key) || null;
  }

  async getCharactersByUser(userId: string): Promise<Character[]> {
    const result: Character[] = [];
    for (const [key, character] of this.characters) {
      if (key.startsWith(`${userId}:`)) {
        result.push(character);
      }
    }
    return result;
  }

  async deleteCharacter(userId: string, characterId: string): Promise<void> {
    const key = this.getCharacterKey(userId, characterId);
    this.characters.delete(key);
  }

  async saveSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getSessionsByUser(userId: string): Promise<Session[]> {
    const result: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        result.push(session);
      }
    }
    return result;
  }

  async updateSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.memories.delete(sessionId);
  }

  async saveMemory(memory: Memory): Promise<void> {
    const sessionMemories = this.memories.get(memory.sessionId) || [];
    sessionMemories.push(memory);
    this.memories.set(memory.sessionId, sessionMemories);
  }

  async getMemoriesBySession(sessionId: string): Promise<Memory[]> {
    return this.memories.get(sessionId) || [];
  }

  async deleteMemoriesBySession(sessionId: string): Promise<void> {
    this.memories.delete(sessionId);
  }

  getStats(): { characters: number; sessions: number; memories: number } {
    let memoryCount = 0;
    for (const memories of this.memories.values()) {
      memoryCount += memories.length;
    }
    return {
      characters: this.characters.size,
      sessions: this.sessions.size,
      memories: memoryCount,
    };
  }

  clear(): void {
    this.characters.clear();
    this.sessions.clear();
    this.memories.clear();
  }
}

export const storage = new InMemoryStorage();
