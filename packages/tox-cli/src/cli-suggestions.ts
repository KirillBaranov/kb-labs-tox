/**
 * TOX CLI suggestions integration
 * Example of how to integrate with the shared CLI suggestions system
 */

import { 
  MultiCLISuggestions, 
  type CommandSuggestion 
} from '@kb-labs/shared-cli-ui';
import { commands } from './cli.manifest.js';

/**
 * Generate TOX-specific suggestions
 */
export function generateTOXSuggestions(
  warningCodes: Set<string>,
  context: any
): CommandSuggestion[] {
  const suggestions: CommandSuggestion[] = [];

  // TOX-specific suggestions based on warning codes
  if (warningCodes.has('TOX_PRESET_MISSING')) {
    suggestions.push({
      id: 'TOX_PRESET_CREATE',
      command: 'kb tox preset create',
      args: [],
      description: 'Create TOX preset file',
      impact: 'safe',
      when: 'TOX_PRESET_MISSING',
      available: true
    });
  }

  if (warningCodes.has('TOX_ENCODE_FAILED')) {
    suggestions.push({
      id: 'TOX_ENCODE_RETRY',
      command: 'kb tox encode',
      args: ['--strict'],
      description: 'Retry encoding with strict mode',
      impact: 'safe',
      when: 'TOX_ENCODE_FAILED',
      available: true
    });
  }

  if (warningCodes.has('TOX_DECODE_FAILED')) {
    suggestions.push({
      id: 'TOX_DECODE_RETRY',
      command: 'kb tox decode',
      args: ['--debug'],
      description: 'Retry decoding with debug mode',
      impact: 'safe',
      when: 'TOX_DECODE_FAILED',
      available: true
    });
  }

  return suggestions;
}

/**
 * Create a TOX CLI suggestions manager
 */
export function createTOXCLISuggestions(): MultiCLISuggestions {
  const manager = new MultiCLISuggestions();
  
  // Register TOX CLI package
  manager.registerPackage({
    name: 'tox',
    group: 'tox',
    commands,
    priority: 70
  });

  return manager;
}

/**
 * Get all available TOX commands
 */
export function getTOXCommands(): string[] {
  return commands.map(cmd => cmd.id);
}
