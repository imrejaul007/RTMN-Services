# @rez/chat - Unified Chat Service

A unified real-time chat service for the ReZ ecosystem.

## Supported Apps

- **rez-app-consumer** - Customer support chat
- **rez-app-admin** - Support agent dashboard
- **rez-now** - AI ordering assistant
- **rez-web-menu** - Web ordering chat

## Installation

```bash
# In your app directory
npm install @rez/chat
```

## Quick Start

### React (Web/Next.js)

```tsx
import { ChatProvider } from '@rez/chat';

function App() {
  return (
    <ChatProvider
      userId={user.id}
      userName={user.name}
      userAvatar={user.avatar}
      token={user.token}
      config={{
        socketUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.rez.com',
        enableOfflineQueue: true,
        enableOptimistic: true,
        typingTimeout: 3000,
      }}
      conversationId={ticketId}
    >
      <ChatComponent />
    </ChatProvider>
  );
}
```

### React Native

```tsx
import { ChatProvider } from '@rez/chat';

function App() {
  return (
    <ChatProvider
      userId={user.id}
      userName={user.name}
      token={user.token}
      config={{
        socketUrl: 'https://api.rez.com',
        enableOfflineQueue: true,
        enableOptimistic: true,
      }}
      conversationId={ticketId}
    >
      <ChatScreen />
    </ChatProvider>
  );
}
```

## Hook API

### useChat

```tsx
import { useChat } from '@rez/chat';

const {
  messages,
  messagesLoading,
  conversation,
  connected,
  otherTyping,
  queueInfo,
  sendMessage,
  sendTyping,
  markAsRead,
  createConversation,
  joinConversation,
  leaveConversation,
  loadMessages,
  rateConversation,
  closeConversation,
} = useChat({
  userId: 'user123',
  userName: 'John Doe',
  apiBaseUrl: 'https://api.rez.com',
  token: 'jwt-token',
  enableOptimistic: true,
});
```

### useSupportChat

For customer support conversations with queue management:

```tsx
import { useSupportChat } from '@rez/chat';

const chat = useSupportChat({
  userId: user.id,
  userName: user.name,
  apiBaseUrl: 'https://api.rez.com',
  token: user.token,
});
```

### useAIMessage

For AI assistant conversations (used in rez-now):

```tsx
import { useAIMessage } from '@rez/chat';

const chat = useAIMessage({
  userId: user.id,
  userName: user.name,
  apiBaseUrl: 'https://api.rez.com',
});
```

## WebSocket Events

The package supports both unified and legacy event names:

### Unified Events
```typescript
message:received      // New message received
message:sent         // Message sent
typing:start         // User started typing
typing:stop          // User stopped typing
message:read         // Message read receipt
conversation:created // New conversation
conversation:closed  // Conversation closed
```

### Legacy Aliases (backward compatible)
```typescript
support_agent_assigned       // Agent assigned to ticket
support_agent_typing_start   // Agent typing
support_agent_typing_stop    // Agent stopped typing
support_user_typing_start    // User typing (for agents)
support_user_typing_stop     // User stopped typing
support_ticket_status_changed // Ticket status change
support_messages_read        // Messages read
```

## Type Definitions

All types are exported from the package:

```typescript
import type {
  ChatMessage,
  Conversation,
  ConversationType,
  MessageAttachment,
  TypingIndicator,
  QueueInfo,
  SupportTicket,
  SupportCategory,
  SupportPriority,
  CreateConversationRequest,
  SendMessageRequest,
  CHAT_EVENTS,
} from '@rez/chat';
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `socketUrl` | string | required | Base URL for WebSocket connection |
| `namespace` | string | 'chat' | Socket.io namespace |
| `enableOfflineQueue` | boolean | true | Queue messages when offline |
| `enableOptimistic` | boolean | true | Show messages immediately |
| `typingTimeout` | number | 3000 | Auto-clear typing after ms |

## Migration from Existing Implementations

### From rez-app-consumer useSupportChat

Replace:
```typescript
import { useSupportChat } from '@/hooks/useSupportChat';
```

With:
```typescript
import { useChat } from '@rez/chat';
// or use the convenience hook
import { useSupportChat } from '@rez/chat';

const chat = useSupportChat({
  userId: user.id,
  userName: user.name,
  apiBaseUrl: process.env.API_URL,
  token: authToken,
});
```

### From rez-now ChatWidget

The AI chat widget can use `useAIMessage` which has AI-specific defaults.

## Backend Requirements

The unified chat service expects these API endpoints:

```
POST /conversations       - Create conversation
GET  /conversations       - List conversations
GET  /conversations/:id   - Get conversation
POST /conversations/:id/close - Close conversation
POST /conversations/:id/rate  - Rate conversation
GET  /messages            - Get messages (query: conversationId, before, limit)
```

WebSocket namespaces:
- `/chat` - General chat
- `/support` - Customer support
- `/ai` - AI assistant

## License

Internal - ReZ Ecosystem
