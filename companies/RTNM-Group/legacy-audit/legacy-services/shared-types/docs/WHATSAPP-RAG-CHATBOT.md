# WhatsApp Receipts + RAG Chatbot

Documentation for the WhatsApp Business API integration and RAG-powered chatbot for the Rez Web Menu.

## Overview

This feature includes:

- **WhatsApp Receipts**: Automated WhatsApp messages after payment with order summary, QR code for reorder, and coins earned
- **RAG Chatbot**: AI-powered menu assistant using Retrieval-Augmented Generation
- **Menu Knowledge Base**: Structured menu data for efficient retrieval
- **Voice Input**: Speech-to-text for the chat widget
- **WhatsApp Bot**: WhatsApp chatbot for order management

## WhatsApp Receipts

### Location

- `lib/notifications/whatsapp.ts` - Core WhatsApp notification functions
- `lib/notifications/orderNotifications.ts` - Order notification integration
- `app/api/notifications/whatsapp/route.ts` - WhatsApp webhook and API endpoints

### Features

- Order summary with items, prices, and customizations
- Coins earned notification
- QR code link for reorder
- Store contact information
- Table number for dine-in orders
- Payment method confirmation

### Configuration

```bash
# Environment Variables
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

### Usage

```typescript
import { sendOrderNotifications } from '@/lib/notifications/orderNotifications';

// After successful payment
await sendOrderNotifications({
  orderId: 'order_123',
  orderNumber: 'ORD-001',
  customerPhone: '9876543210',
  storeName: 'My Restaurant',
  storePhone: '+919876543210',
  items: [
    { id: 'item_1', name: 'Chicken Biryani', quantity: 2, price: 29900 }
  ],
  subtotal: 59800,
  tax: 10764,
  total: 70564,
  coinsEarned: 70,
  orderType: 'dine_in',
  tableNumber: 'T5',
});

// Or use the WhatsApp receipt directly
import { sendWhatsAppReceipt, buildReceiptFromOrder } from '@/lib/notifications/whatsapp';

const receipt = buildReceiptFromOrder(order, coinsEarned);
await sendWhatsAppReceipt(receipt);
```

## RAG Chatbot

### Location

- `lib/chat/ragBot.ts` - Core RAG processing logic
- `app/api/chat/rag/route.ts` - RAG chat API endpoint
- `components/chat/AIChatWidget.tsx` - Updated chat widget with RAG

### Features

- Natural language menu queries
- Personalized recommendations based on dietary preferences
- Order assistance
- Cross-sell suggestions
- Intent detection
- Action buttons (Add to Cart, View Menu, etc.)

### Configuration

```bash
# Environment Variables
LLM_API_URL=https://api.anthropic.com/v1/messages
LLM_API_KEY=your_anthropic_api_key
LLM_MODEL=claude-3-5-haiku-20241107
```

### Usage

```typescript
import { processQuery } from '@/lib/chat/ragBot';

const response = await processQuery({
  userId: 'user_123',
  storeId: 'store_456',
  storeSlug: 'my-restaurant',
  query: 'What vegan options do you have?',
  context: {
    orderHistory: ['biryani', 'naan'],
    dietaryRestrictions: ['vegan'],
  }
}, menuItems);

// Response includes:
// - answer: Generated response text
// - sources: Relevant menu items
// - actions: Suggested actions (add to cart, etc.)
// - confidence: Confidence score
// - suggestedQuestions: Follow-up questions
```

### API Endpoint

```
POST /api/chat/rag

Request:
{
  "userId": "string",
  "storeId": "string",
  "storeSlug": "string",
  "query": "string",
  "context": {
    "orderHistory": ["string"],
    "dietaryRestrictions": ["string"],
    "preferences": ["string"]
  }
}

Response:
{
  "success": true,
  "answer": "string",
  "sources": [
    {
      "id": "string",
      "name": "string",
      "price": 0,
      "description": "string",
      "category": "string",
      "relevanceScore": 0
    }
  ],
  "actions": [
    {
      "type": "recommend|order|navigate|add_to_cart|show_menu",
      "label": "string",
      "data": {}
    }
  ],
  "confidence": 0.85,
  "intent": "menu_query|order|recommendation|dietary|general",
  "suggestedQuestions": ["string"]
}
```

## Menu Knowledge Base

### Location

- `lib/kb/menuKnowledge.ts` - Knowledge base builder and search
- `app/api/kb/menu/route.ts` - Knowledge base API

### Features

- Menu item indexing with full metadata
- Dietary information (vegan, vegetarian, gluten-free, halal)
- Ingredient lists
- Nutrition information
- Pairing suggestions
- Common questions per item
- FAQ generation by category
- Caching for performance

### Usage

```typescript
import { buildMenuKnowledgeBase, searchKnowledgeBase, getKnowledgeBase } from '@/lib/kb/menuKnowledge';

// Build from menu items
const kb = buildMenuKnowledgeBase(menuItems);
const stats = calculateKBStats(kb.items);

// Search
const results = searchKnowledgeBase('biryani', kb.items, {
  dietary: { vegan: true },
  maxPrice: 50000 // paise
});

// Get with caching
const cachedKB = getKnowledgeBase(menuItems);
```

### API Endpoints

```
GET /api/kb/menu
GET /api/kb/menu?action=stats
GET /api/kb/menu?q=biryani&category=main
GET /api/kb/menu?q=vegan&dietary=vegan

POST /api/kb/menu
Body: { "storeSlug": "string", "forceRefresh": boolean }

DELETE /api/kb/menu
```

## Voice Input

### Location

- `components/chat/VoiceInput.tsx` - Voice input component

### Features

- Browser speech recognition (Web Speech API)
- Microphone button with visual feedback
- Auto-submit option
- Supports Indian English
- Graceful fallback for unsupported browsers

### Usage

```tsx
import VoiceInput from '@/components/chat/VoiceInput';

<VoiceInput
  onTranscript={(text) => {
    // Handle transcribed text
    sendMessage(text);
  }}
  disabled={isLoading}
  autoSubmit={true}
/>
```

## WhatsApp Bot

### Location

- `lib/whatsapp/bot.ts` - Bot processing logic
- `app/api/whatsapp/bot/route.ts` - Bot webhook

### Features

- Menu browsing
- Order placement (natural language)
- Order tracking
- FAQs
- Receipt requests
- Session management

### Commands

- `hi` / `hello` - Start conversation
- `menu` - Browse menu categories
- `order` - Place an order
- `track` - Track an order
- `help` - Get help
- `faq` - View FAQs
- `receipt` - Get receipt

### Configuration

```bash
# Uses same WhatsApp credentials as receipts
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

## Chat Analytics

### Location

- `app/api/chat/analytics/route.ts` - Analytics API

### Tracked Events

- `message_sent` - User sends a message
- `message_received` - AI responds
- `session_start` - Chat session begins
- `session_end` - Chat session ends
- `action_clicked` - User clicks an action button
- `order_placed` - Order placed via chat

### Usage

```typescript
// Track events
fetch('/api/chat/analytics', {
  method: 'POST',
  body: JSON.stringify({
    type: 'order_placed',
    sessionId: 'session_123',
    userId: 'user_456',
    storeSlug: 'my-restaurant',
    metadata: { orderId: 'order_789' }
  })
});

// Get analytics
fetch('/api/chat/analytics?storeSlug=my-restaurant&period=7d')
```

## Updated Chat Widget

### Location

- `components/chat/AIChatWidget.tsx` - Enhanced chat widget

### New Features

- RAG-powered responses with recommended items
- Item cards with images and prices
- "Add to Cart" buttons on recommendations
- Action buttons (View Menu, etc.)
- Suggested follow-up questions
- Voice input integration
- Typing indicator
- Session persistence

### Props

```typescript
interface AIChatWidgetProps {
  customStoreName?: string;
  showQuickActions?: boolean;
  position?: 'bottom-right' | 'bottom-left';
  enableRAG?: boolean;        // Enable RAG responses (default: true)
  enableVoiceInput?: boolean; // Enable voice input (default: true)
}
```

## API Reference

### WhatsApp Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/whatsapp` | Webhook verification |
| POST | `/api/notifications/whatsapp/send` | Send WhatsApp message |
| POST | `/api/notifications/whatsapp/webhook` | Receive status updates |

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rag` | Process RAG query |
| GET | `/api/chat/analytics` | Get analytics |
| POST | `/api/chat/analytics` | Record event |

### Knowledge Base Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/kb/menu` | Get KB stats or search |
| POST | `/api/kb/menu` | Build knowledge base |
| DELETE | `/api/kb/menu` | Clear cache |

### WhatsApp Bot Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whatsapp/bot` | Webhook verification |
| POST | `/api/whatsapp/bot` | Process messages |

## Environment Variables

```bash
# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token

# RAG / LLM
LLM_API_URL=https://api.anthropic.com/v1/messages
LLM_API_KEY=your_anthropic_api_key
LLM_MODEL=claude-3-5-haiku-20241107

# Internal API
INTERNAL_API_URL=https://your-internal-api.com
INTERNAL_SERVICE_TOKEN=your_internal_token

# App
NEXT_PUBLIC_BASE_URL=https://reznow.app
```

## Files Created

```
rez-now/
├── lib/
│   ├── notifications/
│   │   ├── whatsapp.ts              # WhatsApp Business API
│   │   └── orderNotifications.ts    # Order notification integration
│   ├── chat/
│   │   └── ragBot.ts                # RAG chatbot logic
│   ├── kb/
│   │   └── menuKnowledge.ts         # Menu knowledge base
│   └── whatsapp/
│       └── bot.ts                   # WhatsApp bot logic
├── components/
│   └── chat/
│       ├── AIChatWidget.tsx         # Updated with RAG + Voice
│       └── VoiceInput.tsx           # Voice input component
├── app/
│   └── api/
│       ├── notifications/
│       │   └── whatsapp/
│       │       └── route.ts         # WhatsApp webhook
│       ├── chat/
│       │   ├── rag/
│       │   │   └── route.ts         # RAG chat API
│       │   └── analytics/
│       │       └── route.ts         # Chat analytics
│       ├── kb/
│       │   └── menu/
│       │       └── route.ts         # Knowledge base API
│       └── whatsapp/
│           └── bot/
│               └── route.ts          # WhatsApp bot webhook
└── docs/
    └── WHATSAPP-RAG-CHATBOT.md       # This documentation
```
