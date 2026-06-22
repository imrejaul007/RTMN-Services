// ── ReZ Chat RN - Package Exports ───────────────────────────────────────────────
// React Native AI Chat components for ReZ ecosystem apps

export { AIChatWidget } from './components/AIChatWidget';
export type { AIChatWidgetProps } from './components/AIChatWidget';

export { AIChatScreen } from './components/AIChatScreen';
export type { AIChatScreenProps } from './components/AIChatScreen';

export { useAIChatRN } from './hooks/useAIChatRN';
export type {
  UseAIChatRNOptions,
  UseAIChatRNReturn,
  AIAppType,
  AIMessage,
  CustomerContext,
} from './hooks/useAIChatRN';
