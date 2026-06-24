/**
 * @hojai/genie SDK
 *
 * Client for HOJAI Genie — the personal AI assistant platform. Wraps the
 * Genie gateway (port 4701) + 22 supporting services into a single
 * ergonomic TypeScript client organized by user capability.
 *
 * @example
 * ```ts
 * import { Genie } from '@hojai/genie';
 *
 * const genie = new Genie({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // Top-level AI query — routes to the right AI service
 * const { response } = await genie.gateway.query({
 *   userId: 'u-1',
 *   query: "What's on my calendar today?"
 * });
 *
 * // Daily briefing
 * const morning = await genie.briefing.today('u-1', 'morning');
 *
 * // Capture a memory
 * await genie.memory.capture({
 *   userId: 'u-1',
 *   type: 'note',
 *   content: 'Met Sarah at HOJAI meetup'
 * });
 *
 * // Universal search
 * const hits = await genie.search.universal({
 *   q: 'meetup last week',
 *   sources: ['memories']
 * });
 *
 * // Register a voice device
 * await genie.voice.registerDevice({
 *   userId: 'u-1', type: 'phone', name: 'My iPhone',
 *   hardwareId: 'UDID-12345'
 * });
 *
 * // Shopping assistant
 * const products = await genie.assistant.shopping({
 *   userId: 'u-1', query: 'organic cotton t-shirts under $20'
 * });
 *
 * // Random memory resurfacing
 * const memory = await genie.serendipity.daily('u-1');
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { GatewayClient } from './gateway.js';
import { MemoryClient } from './memory.js';
import { BriefingClient } from './briefing.js';
import { CalendarClient } from './calendar.js';
import { SearchClient } from './search.js';
import { VoiceClient } from './voice.js';
import { CompanionClient } from './companion.js';
import { AssistantClient } from './assistant.js';
import { LifestyleClient } from './lifestyle.js';
import { SerendipityClient } from './serendipity.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { GatewayClient } from './gateway.js';
export { MemoryClient } from './memory.js';
export { BriefingClient } from './briefing.js';
export { CalendarClient } from './calendar.js';
export { SearchClient } from './search.js';
export { VoiceClient } from './voice.js';
export { CompanionClient } from './companion.js';
export { AssistantClient } from './assistant.js';
export { LifestyleClient } from './lifestyle.js';
export { SerendipityClient } from './serendipity.js';

export type {
  QueryRequest,
  QueryResponse,
  UserContext,
  UserPreferences,
  ConnectedService,
} from './gateway.js';

export type {
  Memory,
  MemoryType,
  CaptureMemoryRequest,
  SearchMemoryRequest,
  SmartForgetRequest,
  MemorySmartForgetResult,
} from './memory.js';

export type {
  Briefing,
  BriefingKind,
  BriefingSection,
} from './briefing.js';

export type {
  CalendarEvent,
  Conflict,
  CreateEventRequest,
} from './calendar.js';

export type {
  SearchHit,
  SearchSource,
  UniversalSearchRequest,
  SavedSearch,
} from './search.js';

export type {
  Device,
  DeviceType,
  WakeWordDetection,
  ListeningMode,
  ListeningModeConfig,
} from './voice.js';

export type {
  CompanionMessage,
  Relationship,
  LifeGoal,
} from './companion.js';

export type {
  ShoppingProduct,
  ShoppingOrder,
  ConsultantTurn,
  ThinkingAnalysis,
} from './assistant.js';

export type {
  LearningPath,
  WellnessEntry,
  MoneyTransaction,
  Habit,
  Creation,
} from './lifestyle.js';

export type {
  SerendipityHit,
  SmartForgetResult,
} from './serendipity.js';

/**
 * Main Genie client (facade).
 *
 * Groups 23 underlying services into 10 capability-oriented sub-clients:
 *   gateway, memory, briefing, calendar, search, voice, companion,
 *   assistant, lifestyle, serendipity.
 */
export class Genie {
  public readonly gateway: GatewayClient;
  public readonly memory: MemoryClient;
  public readonly briefing: BriefingClient;
  public readonly calendar: CalendarClient;
  public readonly search: SearchClient;
  public readonly voice: VoiceClient;
  public readonly companion: CompanionClient;
  public readonly assistant: AssistantClient;
  public readonly lifestyle: LifestyleClient;
  public readonly serendipity: SerendipityClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    this.config = resolveConfig(config);
    this.gateway = new GatewayClient(this.config);
    this.memory = new MemoryClient(this.config);
    this.briefing = new BriefingClient(this.config);
    this.calendar = new CalendarClient(this.config);
    this.search = new SearchClient(this.config);
    this.voice = new VoiceClient(this.config);
    this.companion = new CompanionClient(this.config);
    this.assistant = new AssistantClient(this.config);
    this.lifestyle = new LifestyleClient(this.config);
    this.serendipity = new SerendipityClient(this.config);
  }
}

export default Genie;
