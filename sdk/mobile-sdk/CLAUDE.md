# RTMN Mobile SDK

React Native SDK for Customer Operations in the RTMN ecosystem.

## Services Used

| Service | Purpose | Integration |
|---------|---------|-------------|
| Customer Twin API | Customer profiles | REST API |
| Ticket Service | Support tickets | REST API + WebSocket |
| Chat Service | Real-time messaging | WebSocket |
| Analytics Service | Event tracking | REST API |
| Push Notifications | Firebase | FCM/APNs |

## Build Commands

```bash
npm install
npm run build
```

## Integration Points

- **Event Bus** (4510): Real-time ticket/chat updates
- **Customer Twin**: Profile sync via REZ-consumer APIs
- **Notifications**: Firebase Cloud Messaging

## Dependencies

- axios: HTTP client
- eventemitter3: Event handling
- @react-native-async-storage/async-storage: Token storage
- @react-native-firebase/messaging: Push notifications
