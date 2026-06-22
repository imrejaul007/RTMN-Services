/**
 * GENIE WhatsApp Bot Service - Business Logic
 * Version: 1.0.0 | Date: June 15, 2026
 *
 * WhatsApp Genie Bot - User talks to Genie on WhatsApp
 */

import { createLogger } from '../utils/logger.js';
import { WhatsAppMessage, GenieResponse, Session, ConversationContext } from '../types.js';

const logger = createLogger('whatsapp-bot');

// In-memory sessions
const sessions = new Map<string, Session>();

// ============================================================================
// WhatsApp API
// ============================================================================

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';

/**
 * Send message via WhatsApp API
 */
async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  logger.info('send_whatsapp_message', { to, body: body.substring(0, 50) });

  // In production, call WhatsApp API
  if (ACCESS_TOKEN) {
    const response = await fetch(`${WHATSAPP_API_URL}/me/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body, preview_url: false },
      }),
    });

    if (!response.ok) {
      logger.error('whatsapp_send_failed', { status: response.status });
    }
  }
}

// ============================================================================
// Intent Processing
// ============================================================================

/**
 * Process user message and generate Genie response
 */
async function processMessage(message: WhatsAppMessage): Promise<GenieResponse> {
  logger.info('process_message', { from: message.from, body: message.body.substring(0, 50) });

  const userId = message.from;

  // Get or create session
  let session = sessions.get(userId);
  if (!session) {
    session = {
      user_id: userId,
      phone: userId,
      context: {},
      last_message: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    sessions.set(userId, session);
  }

  // Detect intent
  const intent = detectIntent(message.body);

  // Generate response based on intent
  let response: string;

  switch (intent.intent) {
    case 'greeting':
      response = getGreeting();
      break;

    case 'briefing':
      response = await getBriefing(userId);
      break;

    case 'remember':
      response = await recallMemory(userId, message.body);
      break;

    case 'book':
      response = await handleBooking(userId, message.body);
      break;

    case 'order':
      response = await handleOrder(userId, message.body);
      break;

    case 'reminder':
      response = await setReminder(userId, message.body);
      break;

    case 'query':
      response = await handleQuery(userId, message.body);
      break;

    case 'help':
      response = getHelp();
      break;

    case 'unknown':
    default:
      response = getUnknown();
      break;
  }

  session.last_message = message.body;
  session.updated_at = new Date().toISOString();
  sessions.set(userId, session);

  return { to: message.from, body: response };
}

/**
 * Detect intent from message
 */
function detectIntent(body: string): { intent: string; entities: Record<string, unknown>; confidence: number } {
  const lower = body.toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|good morning|good evening|good night|namaste)/.test(lower)) {
    return { intent: 'greeting', entities: {}, confidence: 0.95 };
  }

  // Briefing
  if (/briefing|daily update|todays summary|what's happening|how am i doing/.test(lower)) {
    return { intent: 'briefing', entities: {}, confidence: 0.9 };
  }

  // Remember/Recall
  if (/remember|recall|what do i|my preferences|i like|i prefer/.test(lower)) {
    return { intent: 'remember', entities: {}, confidence: 0.85 };
  }

  // Booking
  if (/book|reserve|schedule|appointment|flight|hotel|table/.test(lower)) {
    return { intent: 'book', entities: {}, confidence: 0.9 };
  }

  // Ordering
  if (/order|buy|purchase|get me|send me|need/.test(lower)) {
    return { intent: 'order', entities: {}, confidence: 0.85 };
  }

  // Reminders
  if (/remind|reminder|don't forget|alert|call|meet/.test(lower)) {
    return { intent: 'reminder', entities: {}, confidence: 0.85 };
  }

  // Queries
  if (/what|how|when|where|who|which|why/.test(lower)) {
    return { intent: 'query', entities: {}, confidence: 0.7 };
  }

  // Help
  if (/help|commands|what can you do|menu|options/.test(lower)) {
    return { intent: 'help', entities: {}, confidence: 0.95 };
  }

  return { intent: 'unknown', entities: {}, confidence: 0.3 };
}

// ============================================================================
// Response Generators
// ============================================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  let greeting = 'Hello';

  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else if (hour < 21) greeting = 'Good evening';
  else greeting = 'Good night';

  return `${greeting}! 👋

I'm your Genie - your personal AI assistant.

I can help you with:

📋 Your daily briefing
🛒 Shopping & orders
✈️ Travel & bookings
💭 Remembering things
📅 Setting reminders
📊 Business insights
💼 And much more!

What would you like to do today?`;
}

async function getBriefing(userId: string): Promise<string> {
  // In production, call briefing service
  const hour = new Date().getHours();
  let briefing = 'Your Genie Briefing:\n\n';

  briefing += `🌅 Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}!\n\n`;

  briefing += `📅 TODAY:
• 2 meetings scheduled
• 3 tasks pending
• 1 follow-up due\n\n`;

  briefing += `💭 MEMORIES:
• Your usual coffee order: Espresso
• Prefer Italian food for dinner
• Weekly gym on Tuesdays\n\n`;

  briefing += `💼 BUSINESS:
• 45 orders today (↑12% from yesterday)
• 3 new customers
• Revenue: ₹45,000\n\n`;

  briefing += `❤️ RELATIONSHIPS:
• Mom's birthday in 3 days
• Team standup in 2 hours\n\n`;

  briefing += `What would you like to know more about?`;

  return briefing;
}

async function recallMemory(userId: string, query: string): Promise<string> {
  // In production, call memory service
  return `Based on your memories:

🍕 FOOD:
• You prefer Italian food for dinner
• Usually order from La Pinoz
• Average order: ₹800\n
✈️ TRAVEL:
• Last trip: Goa (March 2026)
• Prefer window seats
• Travel light - carry-on only\n
💼 WORK:
• CEO of RTNM Digital
• Focus areas: AI, Commerce
• Prefer morning meetings\n\n

Would you like me to recall something specific?`;
}

async function handleBooking(userId: string, query: string): Promise<string> {
  return `I can help you book:

✈️ FLIGHTS
🏨 HOTELS
🚗 CAB/RIDE
🍽️ RESTAURANTS
💆 SALON
🏋️ GYM

To book, I'll need a few details. What would you like to book?

Or I can check your preferences and suggest options!`;
}

async function handleOrder(userId: string, query: string): Promise<string> {
  return `I can help you order:

🍕 FOOD
🛒 PRODUCTS
📦 GROCERIES
💊 MEDICINES

What would you like to order?

I know your preferences - I can suggest your usual or find something new!`;
}

async function setReminder(userId: string, query: string): Promise<string> {
  return `I'll set that reminder for you! 📝

To create a reminder, please tell me:
• What should I remind you about?
• When? (date and time)
• How should I remind you? (call/message)

Or I can check your calendar and suggest good times!`;
}

async function handleQuery(userId: string, query: string): Promise<string> {
  return `Let me check that for you... 🔍

I can answer questions about:

• Your day, schedule, tasks
• Your orders and deliveries
• Your business metrics
• Your reminders and calendar
• Your preferences and memories

Could you rephrase your question? I'm still learning!`;
}

function getHelp(): string {
  return `Here's what I can help you with:\n\n

📋 BRIEFINGS
• "Give me my daily briefing"
• "What's happening today?"
\n\n
🛒 SHOPPING
• "Order my usual"
• "Book a flight to Goa"
• "Reserve a table at La Pinoz"
\n\n
💭 MEMORIES
• "What do I like?"
• "Remember my coffee order"
• "Where did I last travel?"
\n\n
📅 REMINDERS
• "Remind me to call mom"
• "Set a meeting for 3pm"
• "Don't forget my gym session"
\n\n
💼 BUSINESS
• "How are my sales today?"
• "Any new customers?"
• "Generate my weekly report"
\n\n
Just tell me what you need! 😊`;
}

function getUnknown(): string {
  return `I'm not sure I understood that. 😅

Try saying:
• "Give me my briefing"
• "Order my usual lunch"
• "Book a flight"
• "Remind me to call John"
• "What do I like for dinner?"

Type "help" for all commands!`;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Get session
 */
export async function getSession(userId: string): Promise<Session | null> {
  return sessions.get(userId) || null;
}

/**
 * Clear session
 */
export async function clearSession(userId: string): Promise<boolean> {
  return sessions.delete(userId);
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle incoming WhatsApp message
 */
export async function handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
  logger.info('incoming_message', { from: message.from, type: message.type });

  try {
    const response = await processMessage(message);
    await sendWhatsAppMessage(response.to, response.body);
  } catch (error) {
    logger.error('message_processing_failed', { error });
    await sendWhatsAppMessage(message.from, "Sorry, I encountered an error. Please try again.");
  }
}

/**
 * Send proactive message
 */
export async function sendProactiveMessage(userId: string, body: string): Promise<void> {
  await sendWhatsAppMessage(userId, body);
}
