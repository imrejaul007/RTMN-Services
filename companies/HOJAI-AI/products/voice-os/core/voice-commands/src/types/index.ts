/**
 * Voice Commands Parser Types
 * ==========================
 * Parses voice commands like Wispr Flow's commands.
 */

export interface VoiceCommand {
  type: CommandType;
  raw: string;
  action: string;
  params?: Record<string, unknown>;
  value?: string;
}

export type CommandType =
  | 'format'
  | 'navigation'
  | 'edit'
  | 'selection'
  | 'dictation'
  | 'ai_command'
  | 'unknown';

export interface ParseResult {
  transcript: string;
  commands: VoiceCommand[];
  cleanedTranscript: string;
  formatted: boolean;
}

export interface FormatCommand {
  type: 'format';
  action:
    | 'new_line'
    | 'new_paragraph'
    | 'period'
    | 'comma'
    | 'question_mark'
    | 'exclamation'
    | 'colon'
    | 'semicolon'
    | 'open_paren'
    | 'close_paren'
    | 'hyphen'
    | 'dash'
    | 'quote'
    | 'open_quote'
    | 'close_quote'
    | 'ellipsis';
}

export interface EditCommand {
  type: 'edit';
  action:
    | 'delete'
    | 'scratch_that'
    | 'undo'
    | 'redo'
    | 'select_all'
    | 'select_word'
    | 'select_line'
    | 'copy'
    | 'cut'
    | 'paste'
    | 'backspace';
  count?: number;
}

export interface NavigationCommand {
  type: 'navigation';
  action:
    | 'go_to_start'
    | 'go_to_end'
    | 'move_left'
    | 'move_right'
    | 'move_up'
    | 'move_down'
    | 'page_up'
    | 'page_down'
    | 'go_to_line';
  count?: number;
}

export interface AICommand {
  type: 'ai_command';
  action: string;
  original: string;
}
