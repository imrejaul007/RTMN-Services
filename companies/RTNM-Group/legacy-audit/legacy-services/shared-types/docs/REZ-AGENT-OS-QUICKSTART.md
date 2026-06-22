# ReZ Agent OS - Quick Start Guide

## Installation

```bash
cd packages/rez-chat-ai
npm install
npm run build
```

## Running Tests

```bash
# Run integration tests
npm run test:integration

# Run all tests
npm test
```

## Basic Usage

```typescript
import { createAIChatService } from '@rez/chat-ai';

// Create service with AI brain
const chatService = createAIChatService({
  appType: 'hotel',
  apiKey: process.env.ANTHROPIC_API_KEY,
  memoryEnabled: true,
  hotelServiceUrl: 'http://localhost:4002',
});

// Process a message
const response = await chatService.processMessage({
  conversationId: 'conv-123',
  message: 'Book a hotel in Mumbai',
  userId: 'user-456',
  appType: 'hotel',
  customerContext: {
    customerId: 'user-456',
    name: 'John Doe',
    tier: 'gold',
  },
});

console.log(response.message);
```

## Tool Examples

### Single Tool Call
```typescript
// AI automatically calls tools when needed
const response = await chatService.processMessage({
  message: 'What is my wallet balance?',
  userId: 'user-123',
  appType: 'general',
});
// AI calls get_wallet_balance tool automatically
```

### Cross-App Orchestration
```typescript
// Single message triggers multiple actions
const response = await chatService.processMessage({
  message: 'Book a romantic dinner for 2 and use my karma points',
  userId: 'user-123',
  appType: 'restaurant',
  customerContext: {
    customerId: 'user-123',
    tier: 'gold',
    preferences: { karmaPoints: 500 },
  },
});
// AI calls plan_dinner_date + place_order_with_loyalty
```

## Available Tools

### Base Tools (14)
| Tool | Description |
|------|-------------|
| `search_hotels` | Search hotels |
| `create_hotel_booking` | Book hotel room |
| `search_restaurants` | Search restaurants |
| `place_order` | Place order |
| `reserve_table` | Make reservation |
| `request_room_service` | Hotel room service |
| `request_housekeeping` | Hotel housekeeping |
| `get_wallet_balance` | Check wallet |
| `get_loyalty_points` | Check karma points |
| `get_order_status` | Track order |
| `get_booking_details` | Get booking info |
| `cancel_booking` | Cancel reservation |
| `search_products` | Product search |
| `escalate_to_staff` | Human handoff |

### Orchestration Tools (5)
| Tool | Description |
|------|-------------|
| `book_hotel_with_preferences` | Hotel + preferences + loyalty |
| `plan_dinner_date` | Restaurant + reservation + drinks |
| `place_order_with_loyalty` | Order + points + earn |
| `plan_trip` | Hotel + activities + weather |
| `checkout_with_discounts` | Cart + all discounts |

## Memory Integration

The AI learns from interactions:

```typescript
// Preferences are learned automatically
await chatService.processMessage({
  message: 'I prefer Italian food',
  userId: 'user-123',
  appType: 'restaurant',
});
// AI learns: dining.cuisine = Italian (confidence: 0.5)

// High-confidence intents are logged
await chatService.processMessage({
  message: 'Book a beach resort in Goa',
  userId: 'user-123',
  appType: 'hotel',
});
// Logs intent: travel.book_hotel, travel.beach_resort
```

## Socket Integration

```typescript
// In your Socket.IO server
import { createUnifiedAIChatSocketHandler } from './socket/unifiedAISocket';

const io = new Server(httpServer);
const chatHandler = createUnifiedAIChatSocketHandler(io, {
  enableAI: true,
});

// Clients connect to namespaces:
// /ai/general - General queries
// /ai/hotel - Hotel specific
// /ai/restaurant - Restaurant
// /ai/retail - Retail
// /ai/support - Support
// /ai/room-qr - Hotel room QR
```

## Environment Variables

See [REZ-AGENT-OS-ENV.md](./REZ-AGENT-OS-ENV.md) for full list.
