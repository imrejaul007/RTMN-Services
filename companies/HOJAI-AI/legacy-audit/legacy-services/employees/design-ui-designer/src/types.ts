export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  metadata?: {
    projectId?: string;
    componentType?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  componentDesign?: ComponentDesign;
  designSystem?: DesignSystem;
  agent: string;
  timestamp: number;
}

export interface DesignSystem {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  shadows: ShadowTokens;
  transitions: TransitionTokens;
}

export interface ColorTokens {
  primary: Record<string, string>;
  secondary: Record<string, string>;
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  neutral: Record<string, string>;
}

export interface TypographyTokens {
  fontFamily: {
    primary: string;
    secondary: string;
  };
  fontSize: Record<string, string>;
  fontWeight: Record<string, number>;
  lineHeight: Record<string, number>;
}

export interface SpacingTokens {
  base: number;
  scale: string[];
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
}

export interface TransitionTokens {
  fast: string;
  normal: string;
  slow: string;
}

export interface ComponentDesign {
  name: string;
  states: ComponentState[];
  variants: ComponentVariant[];
  accessibility: AccessibilitySpec;
  code: string;
}

export interface ComponentState {
  name: string;
  description: string;
  styles: Record<string, string>;
}

export interface ComponentVariant {
  name: string;
  description: string;
  styles: Record<string, string>;
}

export interface AccessibilitySpec {
  contrast: string;
  focusVisible: boolean;
  ariaLabels: string[];
  keyboardNav: boolean;
}
