/**
 * Voice Commands Parser
 * ==================
 * Parses voice commands like Wispr Flow.
 *
 * Commands like:
 * - "new line" → \n
 * - "period" → .
 * - "delete that" → delete last word
 * - "new paragraph" → \n\n
 * - "select all" → select everything
 * - "scratch that" → undo last action
 */

import type { VoiceCommand, CommandType, ParseResult, AICommand } from '../types/index.js';

// Command patterns - order matters (first match wins)
const COMMAND_PATTERNS: Array<{
  type: CommandType;
  patterns: RegExp[];
  action: string;
}> = [
  // Format commands
  {
    type: 'format',
    patterns: [
      /\bnew line\b/gi,
      /\bnewline\b/gi,
      /\bline break\b/gi,
    ],
    action: 'new_line',
  },
  {
    type: 'format',
    patterns: [
      /\bnew paragraph\b/gi,
      /\bparagraph\b/gi,
    ],
    action: 'new_paragraph',
  },
  {
    type: 'format',
    patterns: [
      /\bperiod\b/gi,
      /\bfull stop\b/gi,
    ],
    action: 'period',
  },
  {
    type: 'format',
    patterns: [
      /\bcomma\b/gi,
    ],
    action: 'comma',
  },
  {
    type: 'format',
    patterns: [
      /\bquestion mark\b/gi,
      /\bquestion\b/gi,
    ],
    action: 'question_mark',
  },
  {
    type: 'format',
    patterns: [
      /\bexclamation\b/gi,
      /\bexclamation mark\b/gi,
      /\bexclamation point\b/gi,
    ],
    action: 'exclamation',
  },
  {
    type: 'format',
    patterns: [
      /\bcolon\b/gi,
    ],
    action: 'colon',
  },
  {
    type: 'format',
    patterns: [
      /\bsemicolon\b/gi,
    ],
    action: 'semicolon',
  },
  {
    type: 'format',
    patterns: [
      /\bopen paren\b/gi,
      /\bopen parenthesis\b/gi,
      /\bleft paren\b/gi,
    ],
    action: 'open_paren',
  },
  {
    type: 'format',
    patterns: [
      /\bclose paren\b/gi,
      /\bclose parenthesis\b/gi,
      /\bright paren\b/gi,
    ],
    action: 'close_paren',
  },
  {
    type: 'format',
    patterns: [
      /\bhyphen\b/gi,
    ],
    action: 'hyphen',
  },
  {
    type: 'format',
    patterns: [
      /\bdash\b/gi,
      /\ben dash\b/gi,
      /\bem dash\b/gi,
    ],
    action: 'dash',
  },
  {
    type: 'format',
    patterns: [
      /\bopen quote\b/gi,
      /\bopen quotation\b/gi,
    ],
    action: 'open_quote',
  },
  {
    type: 'format',
    patterns: [
      /\bclose quote\b/gi,
      /\bclose quotation\b/gi,
      /\bclose quotes\b/gi,
    ],
    action: 'close_quote',
  },
  {
    type: 'format',
    patterns: [
      /\bellipsis\b/gi,
      /\bthree dots\b/gi,
      /\bdot dot dot\b/gi,
    ],
    action: 'ellipsis',
  },

  // Edit commands
  {
    type: 'edit',
    patterns: [
      /\bdelete that\b/gi,
      /\bdelete last\b/gi,
      /\bbackspace\b/gi,
    ],
    action: 'delete',
  },
  {
    type: 'edit',
    patterns: [
      /\bscratch that\b/gi,
      /\bscratch\b/gi,
      /\bundo that\b/gi,
      /\bundo\b/gi,
    ],
    action: 'scratch_that',
  },
  {
    type: 'edit',
    patterns: [
      /\bredo that\b/gi,
      /\bredo\b/gi,
    ],
    action: 'redo',
  },
  {
    type: 'selection',
    patterns: [
      /\bselect all\b/gi,
      /\bselect everything\b/gi,
      /\bselect all text\b/gi,
    ],
    action: 'select_all',
  },
  {
    type: 'selection',
    patterns: [
      /\bselect word\b/gi,
      /\bselect that word\b/gi,
    ],
    action: 'select_word',
  },
  {
    type: 'selection',
    patterns: [
      /\bselect line\b/gi,
      /\bselect that line\b/gi,
    ],
    action: 'select_line',
  },
  {
    type: 'edit',
    patterns: [
      /\bcopy that\b/gi,
      /\bcopy\b/gi,
    ],
    action: 'copy',
  },
  {
    type: 'edit',
    patterns: [
      /\bcut that\b/gi,
      /\bcut\b/gi,
    ],
    action: 'cut',
  },
  {
    type: 'edit',
    patterns: [
      /\bpaste that\b/gi,
      /\bpaste\b/gi,
    ],
    action: 'paste',
  },

  // Navigation commands
  {
    type: 'navigation',
    patterns: [
      /\bgo to start\b/gi,
      /\bgo to beginning\b/gi,
      /\bbeginning of\b/gi,
    ],
    action: 'go_to_start',
  },
  {
    type: 'navigation',
    patterns: [
      /\bgo to end\b/gi,
      /\bend of\b/gi,
    ],
    action: 'go_to_end',
  },
  {
    type: 'navigation',
    patterns: [
      /\bmove left\b/gi,
      /\bleft\b/gi,
    ],
    action: 'move_left',
  },
  {
    type: 'navigation',
    patterns: [
      /\bmove right\b/gi,
      /\bright\b/gi,
    ],
    action: 'move_right',
  },
];

// Format symbol mappings
const FORMAT_SYMBOLS: Record<string, string> = {
  new_line: '\n',
  new_paragraph: '\n\n',
  period: '.',
  comma: ',',
  question_mark: '?',
  exclamation: '!',
  colon: ':',
  semicolon: ';',
  open_paren: '(',
  close_paren: ')',
  hyphen: '-',
  dash: '—',
  open_quote: '"',
  close_quote: '"',
  ellipsis: '...',
};

// AI command patterns
const AI_COMMAND_PATTERNS: Array<{
  pattern: RegExp;
  action: string;
}> = [
  // Transform commands
  { pattern: /\b(translate|convert)\b/gi, action: 'translate' },
  { pattern: /\b(summarize|summary|tl;dr|tl;dr)\b/gi, action: 'summarize' },
  { pattern: /\b(make|shorter|concise|brief)\b/gi, action: 'shorter' },
  { pattern: /\b(make|longer|expand|elaborate)\b/gi, action: 'longer' },
  { pattern: /\b(formal|professional|business)\b/gi, action: 'formal' },
  { pattern: /\b(casual|relaxed|friendly)\b/gi, action: 'casual' },
  { pattern: /\b(fix|correct|grammar)\b/gi, action: 'grammar' },
  { pattern: /\b(emoji|emojis)\b/gi, action: 'emoji' },
  { pattern: /\bbullet points?\b/gi, action: 'bullet_points' },
  { pattern: /\bnumbered list\b/gi, action: 'numbered_list' },
  // Action commands
  { pattern: /\b(send|share)\b/gi, action: 'send' },
  { pattern: /\b(reply|respond)\b/gi, action: 'reply' },
  { pattern: /\b(forward|forward to)\b/gi, action: 'forward' },
  { pattern: /\b(book|schedule|appointment)\b/gi, action: 'book' },
  { pattern: /\b(order|buy|purchase)\b/gi, action: 'order' },
  { pattern: /\b(call|phone|dial)\b/gi, action: 'call' },
  { pattern: /\b(search|find|look up)\b/gi, action: 'search' },
  { pattern: /\b(remind|reminder)\b/gi, action: 'remind' },
  { pattern: /\b(email|mail)\b/gi, action: 'email' },
];

export class VoiceCommandParser {
  /**
   * Parse transcript and extract commands
   */
  parse(transcript: string): ParseResult {
    const commands: VoiceCommand[] = [];
    let cleanedTranscript = transcript;

    // Find and extract commands
    for (const cmdGroup of COMMAND_PATTERNS) {
      for (const pattern of cmdGroup.patterns) {
        const matches = transcript.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Extract command
            const command: VoiceCommand = {
              type: cmdGroup.type,
              raw: match,
              action: cmdGroup.action,
            };

            // For format commands, extract value
            if (cmdGroup.type === 'format') {
              command.value = FORMAT_SYMBOLS[cmdGroup.action];
            }

            commands.push(command);

            // Remove command from transcript
            cleanedTranscript = cleanedTranscript.replace(match, ' ');
          }
        }
      }
    }

    // Check for AI commands
    const aiCommand = this.detectAICommand(cleanedTranscript);
    if (aiCommand) {
      commands.push(aiCommand);
      // Remove AI command phrase from transcript
      cleanedTranscript = cleanedTranscript.replace(aiCommand.raw, ' ').trim();
    }

    // Clean up extra spaces
    cleanedTranscript = cleanedTranscript.replace(/\s+/g, ' ').trim();

    // Capitalize first letter if sentence
    if (cleanedTranscript.length > 0 && !commands.some(c => c.action === 'period' || c.action === 'question_mark')) {
      cleanedTranscript = this.applyAutoFormatting(cleanedTranscript);
    }

    return {
      transcript: cleanedTranscript,
      commands,
      cleanedTranscript,
      formatted: commands.some(c => c.type === 'format'),
    };
  }

  /**
   * Apply automatic formatting (capitalization, etc.)
   */
  private applyAutoFormatting(text: string): string {
    // Capitalize first letter
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Auto-add period at end if no command found
    if (!text.endsWith('.') && !text.endsWith('?') && !text.endsWith('!') && !text.endsWith(':')) {
      text = text + '.';
    }

    return text;
  }

  /**
   * Detect AI command in transcript
   */
  detectAICommand(text: string): VoiceCommand | null {
    for (const { pattern, action } of AI_COMMAND_PATTERNS) {
      if (pattern.test(text)) {
        return {
          type: 'ai_command',
          raw: text,
          action,
          params: {},
        };
      }
    }
    return null;
  }

  /**
   * Execute a command and return the result
   */
  executeCommand(
    command: VoiceCommand,
    currentText: string,
    cursorPosition: number
  ): { text: string; cursorPosition: number; result: string } {
    switch (command.type) {
      case 'format':
        return this.executeFormatCommand(command, currentText, cursorPosition);

      case 'edit':
        return this.executeEditCommand(command, currentText, cursorPosition);

      case 'navigation':
        return this.executeNavigationCommand(command, currentText, cursorPosition);

      case 'selection':
        return this.executeSelectionCommand(command, currentText, cursorPosition);

      case 'ai_command':
        return { text: currentText, cursorPosition, result: `AI: ${command.action}` };

      default:
        return { text: currentText, cursorPosition, result: 'Unknown command' };
    }
  }

  /**
   * Execute format command
   */
  private executeFormatCommand(
    command: VoiceCommand,
    text: string,
    cursor: number
  ): { text: string; cursorPosition: number; result: string } {
    const symbol = command.value || '';

    // Insert at cursor position
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const newText = before + symbol + after;

    // Move cursor after the inserted symbol
    const newCursor = cursor + symbol.length;

    return {
      text: newText,
      cursorPosition: newCursor,
      result: `Inserted "${symbol}"`,
    };
  }

  /**
   * Execute edit command
   */
  private executeEditCommand(
    command: VoiceCommand,
    text: string,
    cursor: number
  ): { text: string; cursorPosition: number; result: string } {
    switch (command.action) {
      case 'delete':
        // Delete last word
        const words = text.slice(0, cursor).split(/\s+/);
        if (words.length > 1) {
          words.pop();
          const deleted = text.slice(cursor).startsWith(' ') ? '' : ' ';
          const newText = words.join(' ') + deleted + text.slice(cursor);
          return {
            text: newText,
            cursorPosition: words.join(' ').length,
            result: `Deleted last word`,
          };
        }
        return { text, cursorPosition: cursor, result: 'Nothing to delete' };

      case 'scratch_that':
      case 'undo':
        // In a real implementation, this would use undo stack
        return { text, cursorPosition: cursor, result: 'Undo last action' };

      case 'redo':
        return { text, cursorPosition: cursor, result: 'Redo last action' };

      case 'copy':
        return { text, cursorPosition: cursor, result: 'Copied to clipboard' };

      case 'cut':
        return { text, cursorPosition: cursor, result: 'Cut to clipboard' };

      case 'paste':
        return { text, cursorPosition: cursor, result: 'Pasted from clipboard' };

      default:
        return { text, cursorPosition: cursor, result: 'Unknown edit command' };
    }
  }

  /**
   * Execute navigation command
   */
  private executeNavigationCommand(
    command: VoiceCommand,
    text: string,
    cursor: number
  ): { text: string; cursorPosition: number; result: string } {
    switch (command.action) {
      case 'go_to_start':
        return { text, cursorPosition: 0, result: 'Moved to start' };

      case 'go_to_end':
        return { text, cursorPosition: text.length, result: 'Moved to end' };

      case 'move_left':
        const newCursor = Math.max(0, cursor - 1);
        return { text, cursorPosition: newCursor, result: `Moved to ${newCursor}` };

      case 'move_right':
        const rightCursor = Math.min(text.length, cursor + 1);
        return { text, cursorPosition: rightCursor, result: `Moved to ${rightCursor}` };

      default:
        return { text, cursorPosition: cursor, result: 'Unknown navigation command' };
    }
  }

  /**
   * Execute selection command
   */
  private executeSelectionCommand(
    command: VoiceCommand,
    text: string,
    cursor: number
  ): { text: string; cursorPosition: number; result: string } {
    switch (command.action) {
      case 'select_all':
        return {
          text,
          cursorPosition: text.length,
          result: 'Selected all',
        };

      case 'select_word':
        // Select word at cursor
        const wordMatch = text.slice(0, cursor).match(/\S+$/);
        if (wordMatch) {
          const start = cursor - wordMatch[0].length;
          return { text, cursorPosition: cursor, result: `Selected word at ${start}` };
        }
        return { text, cursorPosition: cursor, result: 'No word at cursor' };

      case 'select_line':
        // Select line at cursor
        const lines = text.slice(0, cursor).split('\n');
        const lineStart = text.slice(0, cursor).lastIndexOf('\n') + 1;
        const lineEnd = text.indexOf('\n', cursor);
        return {
          text,
          cursorPosition: lineEnd === -1 ? text.length : lineEnd,
          result: `Selected line ${lines.length}`,
        };

      default:
        return { text, cursorPosition: cursor, result: 'Unknown selection command' };
    }
  }

  /**
   * Get all supported commands
   */
  getSupportedCommands(): { type: CommandType; commands: string[] }[] {
    return [
      {
        type: 'format',
        commands: [
          'new line', 'new paragraph', 'period', 'comma',
          'question mark', 'exclamation', 'colon', 'semicolon',
          'open paren', 'close paren', 'hyphen', 'dash',
          'open quote', 'close quote', 'ellipsis',
        ],
      },
      {
        type: 'edit',
        commands: [
          'delete that', 'scratch that', 'undo', 'redo',
          'copy', 'cut', 'paste',
        ],
      },
      {
        type: 'selection',
        commands: ['select all', 'select word', 'select line'],
      },
      {
        type: 'navigation',
        commands: ['go to start', 'go to end', 'move left', 'move right'],
      },
    ];
  }

  /**
   * Get all AI commands
   */
  getAICCommands(): string[] {
    return AI_COMMAND_PATTERNS.map(c => c.action);
  }
}
