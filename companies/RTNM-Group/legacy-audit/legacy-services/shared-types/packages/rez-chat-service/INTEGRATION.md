# AI Chat Integration Guide - ReZ Ecosystem

## Overview

The unified AI chat system works across all ReZ ecosystem apps:
- **rez-app-consumer** - Customer support
- **rez-app-admin** - Support dashboard
- **rez-now** - AI ordering assistant
- **rez-web-menu** - Web ordering
- **Hotel PMS** - Guest-to-staff messaging
- **Hotel Room QR** - In-room QR code chat

## Socket.IO Namespaces

| App Type | Namespace | Purpose |
|----------|-----------|---------|
| Hotel | `/ai/hotel` | Hotel-specific queries |
| Room QR | `/ai/room-qr` | In-room service chat |
| Web Menu | `/ai/web-menu` | Restaurant menu ordering |
| Restaurant | `/ai/restaurant` | Restaurant support |
| Retail | `/ai/retail` | Shopping support |
| Support | `/ai/support` | General customer support |
| General | `/ai/general` | Cross-app AI assistant |

## Quick Start

### 1. Install Dependencies

```bash
# In your app's package.json, add:
"@rez/chat-ai": "file:../../packages/rez-chat-ai",
"@rez/chat": "file:../../packages/rez-chat-service"
```

```bash
npm install
```

### 2. Server Setup (Node.js)

```typescript
// server.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createUnifiedAIChatSocketHandler } from './socket/unifiedAISocket';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with AI chat
createUnifiedAIChatSocketHandler(httpServer as any, {
  enableAI: !!process.env.ANTHROPIC_API_KEY
});

httpServer.listen(3000, () => {
  console.log('Server running with AI chat');
});
```

### 3. Client Setup (React)

```tsx
// App.tsx
import { AIFloatingChat } from '@rez/chat';

function App() {
  return (
    <AIFloatingChat
      appType="hotel"  // or: restaurant, retail, support, general
      userId={user.id}
      merchantId={hotel.id}
      customerContext={{
        customerId: user.id,
        name: user.name,
        tier: user.membershipTier,
      }}
      socketUrl="http://localhost:3000"
      onEscalate={(data) => {
        console.log('Escalate to staff:', data);
      }}
    />
  );
}
```

## Integration Examples

### Hotel Room QR Code

```tsx
import { useAIChat } from '@rez/chat';

function RoomServicePage() {
  const { messages, sendMessage, selectSuggestion } = useAIChat({
    userId: booking.guestId,
    appType: 'room-qr',
    merchantId: hotel.id,
    customerContext: {
      customerId: booking.guestId,
      name: booking.guestName,
      tier: booking.memberTier,
    },
    socketUrl: process.env.API_URL,
    onAction: handleOrderAction,
  });

  // ... render chat UI
}
```

### Restaurant Ordering

```tsx
import { useAIChat } from '@rez/chat';

function RestaurantChat() {
  const { messages, sendMessage } = useAIChat({
    userId: user.id,
    appType: 'restaurant',
    merchantId: restaurant.id,
    customerContext: {
      customerId: user.id,
      name: user.name,
      preferences: user.dietaryPreferences,
    },
    socketUrl: process.env.API_URL,
    onAction: handleOrderAction,
  });

  return (
    <div>
      <ChatMessages messages={messages} />
      <MenuSuggestions onSelect={selectSuggestion} />
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
```

### Retail Support

```tsx
import { useAIChat } from '@rez/chat';

function RetailSupport() {
  const { messages, sendMessage, transferToStaff } = useAIChat({
    userId: user.id,
    appType: 'retail',
    customerContext: {
      customerId: user.id,
      name: user.name,
      tier: user.loyaltyTier,
      recentOrders: user.orderHistory,
    },
    socketUrl: process.env.API_URL,
    onEscalate: () => {
      // Show "Connecting to support..." modal
    },
  });

  return <ChatUI messages={messages} onSend={sendMessage} />;
}
```

### Cross-App Support (rez-app)

```tsx
import { useAIChat } from '@rez/chat';

function GlobalSupport() {
  const { messages, sendMessage } = useAIChat({
    userId: user.id,
    appType: 'general',  // Works across all apps
    customerContext: {
      customerId: user.id,
      name: user.name,
      tier: user.membershipTier,
      recentOrders: user.allOrders,
      bookings: user.allBookings,
    },
    socketUrl: process.env.API_URL,
  });

  return <GlobalChatUI messages={messages} onSend={sendMessage} />;
}
```

## API Reference

### useAIChat Hook

```typescript
interface UseAIChatOptions {
  userId: string;
  conversationId?: string;
  appType: 'hotel' | 'restaurant' | 'retail' | 'support' | 'general' | 'room-qr' | 'web-menu';
  merchantId?: string;
  customerContext?: CustomerContext;
  socketUrl: string;
  token?: string;
  autoConnect?: boolean;
  enableSuggestions?: boolean;
  onEscalate?: (data: { reason: string; department?: string }) => void;
  onAction?: (action: { type: string; data: Record<string, unknown> }) => void;
}

interface UseAIChatReturn {
  messages: AIMessage[];
  isTyping: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  conversationId: string | null;
  suggestions: string[];
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  selectSuggestion: (suggestion: string) => Promise<void>;
  transferToStaff: (reason?: string, department?: string) => void;
  endChat: (rating?: number) => void;
  clearMessages: () => void;
  connect: () => void;
  disconnect: () => void;
}
```

### Customer Context

```typescript
interface CustomerContext {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;
  tier?: string;
  preferences?: Record<string, unknown>;
  recentOrders?: Array<{
    orderId: string;
    type: string;
    status: string;
    total: number;
  }>;
  bookings?: Array<{
    bookingId: string;
    type: string;
    status: string;
  }>;
  totalSpent?: number;
  visitCount?: number;
}
```

## Environment Variables

```bash
# Server (.env)
ANTHROPIC_API_KEY=sk-ant-...  # Enable AI responses

# Client (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Sensitive Data Protection

The AI chat automatically sanitizes:
- Card numbers (CVV, full numbers)
- Passwords and PINs
- API keys and tokens
- Bank account numbers
- Transaction IDs
- SSN/National IDs
- OTP codes

None of these will ever be displayed or logged by the AI system.

## Knowledge Base

Each app type has its own knowledge base:

| App | Knowledge |
|-----|-----------|
| Hotel | Check-in/out, room service, housekeeping, concierge, spa, amenities |
| Restaurant | Menu, reservations, dietary info, loyalty program |
| Retail | Products, orders, returns, shipping, loyalty |
| Support | General policies, account help, troubleshooting |

Plus customer-specific knowledge from their history and preferences.
