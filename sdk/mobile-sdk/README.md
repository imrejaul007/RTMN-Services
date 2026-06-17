# RTMN Mobile SDK

React Native / Mobile SDK for Customer Operations in the RTMN ecosystem.

## Features

- **Customer Twin Integration** - Sync and manage customer profiles
- **Ticket Management** - Create, update, and track support tickets
- **Real-time Chat** - Live messaging with push notifications
- **Analytics Tracking** - Track user events and metrics
- **Push Notifications** - Firebase Cloud Messaging integration

## Installation

```bash
npm install @rtmn/mobile-sdk
```

### iOS Setup

```bash
cd ios && pod install
```

### Android Setup

Add to `android/app/build.gradle`:

```gradle
implementation '@rtmn/mobile-sdk'
```

## Quick Start

```typescript
import RTMNSdk from '@rtmn/mobile-sdk';

// Initialize SDK
const sdk = new RTMNSdk({
  apiUrl: 'https://rtmn-api.onrender.com',
  eventBusUrl: 'wss://rtmn-api.onrender.com/events',
  firebaseConfig: {
    apiKey: 'YOUR_API_KEY',
    projectId: 'YOUR_PROJECT_ID',
  },
});

await sdk.init();

// Customer Twin
const customer = await sdk.customer.getProfile();

// Tickets
const ticket = await sdk.ticket.create({
  title: 'Support Request',
  description: 'Need help with order',
  priority: 'high',
});

// Chat
sdk.chat.connect(customer.id);
sdk.chat.onMessage((msg) => console.log(msg));

// Analytics
sdk.analytics.track('screen_view', { screen: 'Home' });
```

## API Reference

### SDK Configuration

```typescript
RTMNSdk.init(config: SDKConfig): Promise<void>

interface SDKConfig {
  apiUrl: string;
  eventBusUrl?: string;
  firebaseConfig?: FirebaseConfig;
  pushNotifications?: boolean;
  debug?: boolean;
}
```

### Customer Twin API

```typescript
sdk.customer.getProfile(): Promise<Customer>
sdk.customer.updateProfile(data: Partial<Customer>): Promise<Customer>
sdk.customer.getHistory(): Promise<Interaction[]>
sdk.customer.syncTwins(): Promise<void>
```

### Ticket API

```typescript
sdk.ticket.create(data: TicketInput): Promise<Ticket>
sdk.ticket.getAll(filters?: TicketFilters): Promise<Ticket[]>
sdk.ticket.getById(id: string): Promise<Ticket>
sdk.ticket.update(id: string, data: Partial<Ticket>): Promise<Ticket>
sdk.ticket.addComment(id: string, comment: string): Promise<Comment>
sdk.ticket.onUpdate(callback: (ticket: Ticket) => void): void
```

### Chat API

```typescript
sdk.chat.connect(userId: string): void
sdk.chat.disconnect(): void
sdk.chat.sendMessage(content: string, metadata?: object): void
sdk.chat.onMessage(callback: (message: ChatMessage) => void): void
sdk.chat.onTyping(callback: (userId: string) => void): void
sdk.chat.getHistory(channelId: string): Promise<ChatMessage[]>
```

### Analytics API

```typescript
sdk.analytics.track(event: string, properties?: object): void
sdk.analytics.screen(name: string, properties?: object): void
sdk.analytics.identify(userId: string, traits?: object): void
sdk.analytics.flush(): Promise<void>
```

## Push Notifications

### Setup

```typescript
// Request permission
const hasPermission = await sdk.notifications.requestPermission();

// Subscribe to topics
sdk.notifications.subscribe('tickets');
sdk.notifications.subscribe('chat');

// Handle notifications
sdk.notifications.onNotification((notification) => {
  console.log(notification.title, notification.body);
});
```

## Example App

See `example/App.tsx` for a complete implementation.

## License

MIT
