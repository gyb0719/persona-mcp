export { listCharactersTool, listCharacters } from './listCharacters.js';
export { createCharacterTool, createCharacter } from './createCharacter.js';
export { getCharacterTool, getCharacter } from './getCharacter.js';
export { startRoleplayTool, startRoleplay } from './startRoleplay.js';
export { continueRoleplayTool, continueRoleplay } from './continueRoleplay.js';

import { listCharactersTool } from './listCharacters.js';
import { createCharacterTool } from './createCharacter.js';
import { getCharacterTool } from './getCharacter.js';
import { startRoleplayTool } from './startRoleplay.js';
import { continueRoleplayTool } from './continueRoleplay.js';

export const allTools = [
  listCharactersTool,
  createCharacterTool,
  getCharacterTool,
  startRoleplayTool,
  continueRoleplayTool,
];
