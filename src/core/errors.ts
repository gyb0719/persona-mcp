export class PersonaMcpError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PersonaMcpError';
  }
}

export type ErrorCode =
  | 'CHARACTER_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'TEMPLATE_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'STORAGE_ERROR'
  | 'INTERNAL_ERROR';

export class CharacterNotFoundError extends PersonaMcpError {
  constructor(characterId: string) {
    super(
      `Character not found: ${characterId}`,
      'CHARACTER_NOT_FOUND',
      { characterId }
    );
  }
}

export class SessionNotFoundError extends PersonaMcpError {
  constructor(sessionId: string) {
    super(
      `Session not found: ${sessionId}`,
      'SESSION_NOT_FOUND',
      { sessionId }
    );
  }
}

export class TemplateNotFoundError extends PersonaMcpError {
  constructor(templateId: string) {
    super(
      `Template not found: ${templateId}`,
      'TEMPLATE_NOT_FOUND',
      { templateId }
    );
  }
}

export class InvalidInputError extends PersonaMcpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_INPUT', details);
  }
}

export function isPersonaMcpError(error: unknown): error is PersonaMcpError {
  return error instanceof PersonaMcpError;
}
