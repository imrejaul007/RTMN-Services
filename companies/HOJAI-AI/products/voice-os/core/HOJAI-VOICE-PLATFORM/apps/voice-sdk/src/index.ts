// ============================================================================
// HOJAI VOICE SDK - Main Entry Point
// ============================================================================

export { VoiceSession } from './VoiceSession';
export { VoiceAgent } from './VoiceAgent';
export * from './types';

// Convenience function to create a VoiceAgent
import { VoiceAgent } from './VoiceAgent';
import { VoiceAgentOptions } from './types';

export function createVoiceAgent(options: VoiceAgentOptions): VoiceAgent {
  return new VoiceAgent(options);
}

// React hook for voice agent
export { useVoiceAgent } from './react';

/**
 * Example usage:
 *
 * ```typescript
 * import { VoiceAgent } from '@hojai/voice-sdk';
 *
 * const agent = new VoiceAgent({
 *   apiKey: 'your-api-key',
 *   agentId: 'agent-id',
 *   language: 'en-IN',
 *   voiceId: '预设-indian-female-1',
 * });
 *
 * agent.on('response', (text, audio) => {
 *   console.log('Agent said:', text);
 *   if (audio) {
 *     // Play the audio
 *     new Audio(audio).play();
 *   }
 * });
 *
 * await agent.start();
 * await agent.speak('Namaste! How can I help you?');
 * ```
 */
