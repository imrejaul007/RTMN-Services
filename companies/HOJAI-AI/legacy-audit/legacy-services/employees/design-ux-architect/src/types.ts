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
    framework?: 'react' | 'vue' | 'angular' | 'vanilla';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  cssSystem?: CSSSystem;
  layoutSpec?: LayoutSpec;
  uxStructure?: UXStructure;
  themeToggle?: ThemeToggleSpec;
  agent: string;
  timestamp: number;
}

export interface CSSSystem {
  colors: Record<string, string>;
  typography: TypographySpec;
  spacing: Record<string, string>;
  layout: LayoutTokens;
  shadows: Record<string, string>;
  transitions: Record<string, string>;
  darkTheme: Record<string, string>;
  systemTheme: Record<string, string>;
}

export interface TypographySpec {
  scale: Record<string, string>;
  weights: Record<string, number>;
  lineHeights: Record<string, number>;
}

export interface LayoutTokens {
  containerSm: string;
  containerMd: string;
  containerLg: string;
  containerXl: string;
}

export interface LayoutSpec {
  containerSystem: ContainerSystem;
  gridPatterns: GridPattern[];
  componentHierarchy: ComponentHierarchy;
  responsiveStrategy: ResponsiveStrategy;
}

export interface ContainerSystem {
  mobile: string;
  tablet: string;
  desktop: string;
  large: string;
}

export interface GridPattern {
  name: string;
  description: string;
  columns: number;
  gap: string;
  responsive: boolean;
}

export interface ComponentHierarchy {
  level1: string[];
  level2: string[];
  level3: string[];
}

export interface ResponsiveStrategy {
  breakpoints: Record<string, string>;
  approach: string;
  patterns: string[];
}

export interface UXStructure {
  pageHierarchy: PageHierarchy;
  navigationStrategy: string;
  contentHierarchy: string[];
  interactionPatterns: InteractionPattern[];
  accessibilityFoundation: AccessibilityFoundation;
}

export interface PageHierarchy {
  primary: string[];
  secondary: string[];
  tertiary: string[];
}

export interface InteractionPattern {
  name: string;
  description: string;
  implementation: string;
}

export interface AccessibilityFoundation {
  keyboardNav: string;
  screenReader: string;
  colorContrast: string;
}

export interface ThemeToggleSpec {
  html: string;
  javascript: string;
  css: string;
}
