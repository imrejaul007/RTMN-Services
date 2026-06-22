# Integrations - Source of Truth v2.0

**Last Updated:** May 11, 2026

---

## Overview

ReZ integrates with various third-party services for payments, communications, infrastructure, and AI.

## Complete Integration Directory

### Payment Providers (6)

| Provider | Service | Features | Status |
|----------|---------|----------|--------|
| **Razorpay** | Payment Service | Cards, net banking, wallets, UPI, neon | Active |
| **Stripe** | Payment Service | International payments, subscriptions | Active |
| **PhonePe** | Payment Service | UPI, cards, wallets | Active |
| **Paytm** | Payment Service | UPI, payments | Active |
| **UPI (Native)** | Payment Service | Real-time payments | Active |
| **BNPL** | BNPL Service | Buy Now Pay Later | Active |

### Communication Providers (8)

| Provider | Service | Features | Status |
|----------|---------|----------|--------|
| **Twilio** | Notifications, Voice AI | SMS, WhatsApp, Voice, Flex | Active |
| **SendGrid** | Notifications | Email | Active |
| **Firebase** | Push Service | Push notifications, Auth | Active |
| **Socket.io** | Socket Service | Real-time messaging | Active |
| **WhatsApp Business** | Notifications | Business messaging | Active |
| **MSG91** | Notifications | SMS (backup) | Active |
| **Gupshup** | Notifications | SMS, WhatsApp | Active |
| **Exotel** | Notifications | Voice, SMS | Active |

### AI Providers (6)

| Provider | Service | Features | Status |
|----------|---------|----------|--------|
| **OpenAI** | AI Services | GPT-4, embeddings, fine-tuning | Active |
| **Anthropic** | AI Services | Claude models | Active |
| **Twilio Voice** | Voice AI | Voice processing | Active |
| **Google Cloud AI** | ML Engine | Vertex AI, AutoML | Active |
| **Hugging Face** | ML Engine | Models, inference | Partial |
| **Vector DB** | Intent Graph | Embedding storage | Active |

### Infrastructure Providers (8)

| Provider | Usage | Status |
|----------|-------|--------|
| **MongoDB Atlas** | Primary database | Active |
| **Redis Cloud** | Caching, sessions | Active |
| **BullMQ** | Job queues (Redis-based) | Active |
| **Vercel** | Frontend hosting | Active |
| **Render** | Backend services | Active |
| **Cloudflare** | CDN, DDoS protection | Active |
| **AWS S3** | File storage | Active |
| **Google Cloud** | Cloud services | Active |

### OTA Integrations (10)

| Provider | Service | Channels | Status |
|----------|---------|----------|--------|
| **MakeMyTrip** | Channel Manager | Hotels | Active |
| **OYO** | Channel Manager | Hotels | Active |
| **Booking.com** | Channel Manager | Hotels | Active |
| **Agoda** | Channel Manager | Hotels | Active |
| **Airbnb** | Channel Manager | Hotels | Active |
| **Goibibo** | Channel Manager | Hotels | Active |
| **Yatra** | Channel Manager | Hotels | Active |
| **Cleartrip** | Channel Manager | Hotels | Active |
| **MMT** | Channel Manager | Hotels | Active |
| **Expedia** | Channel Manager | Hotels | Active |

### Corporate Integrations (5)

| Integration | Service | Purpose | Status |
|-------------|---------|---------|--------|
| **CorpPerks** | CorpPerks Service | Enterprise perks | Active |
| **NextaBizz** | Procurement Service | B2B procurement | Active |
| **Karma** | Karma Service | Loyalty program | Active |
| **Gift Cards** | Gift Cards Service | Gift cards | Active |
| **BBPS** | BBPS Service | Bill payments | Active |

### Maps & Location (3)

| Provider | Usage | Status |
|----------|-------|--------|
| **Google Maps** | Location, directions | Active |
| **Mapbox** | Maps (alternative) | Active |
| **GeoJSON** | Location data | Active |

### Analytics & Tracking (5)

| Provider | Usage | Status |
|----------|-------|--------|
| **Mixpanel** | Analytics | Active |
| **Google Analytics** | Web analytics | Active |
| **Firebase Analytics** | Mobile analytics | Active |
| **Amplitude** | Product analytics | Active |
| **Segment** | Customer data platform | Active |

### Identity & Auth (4)

| Provider | Usage | Status |
|----------|-------|--------|
| **Firebase Auth** | User authentication | Active |
| **Google Sign-In** | Social login | Active |
| **Apple Sign-In** | Social login | Active |
| **OTP Services** | Phone verification | Active |

---

## Webhook Integration

The `rez-webhook-service` manages outgoing webhooks:

### Supported Events

| Event | Description |
|-------|-------------|
| `order.created` | New order placed |
| `order.updated` | Order status changed |
| `order.completed` | Order delivered |
| `order.cancelled` | Order cancelled |
| `payment.success` | Payment successful |
| `payment.failed` | Payment failed |
| `refund.initiated` | Refund started |
| `refund.completed` | Refund processed |
| `user.registered` | New user signup |
| `user.verified` | Phone verified |

### Webhook Configuration

```json
{
  "url": "https://your-endpoint.com/webhook",
  "events": ["order.created", "order.completed"],
  "secret": "webhook-secret-key"
}
```

---

## SDKs & Libraries

### Mobile Development

| SDK | Usage |
|-----|-------|
| Expo | Mobile app development |
| React Navigation | App navigation |
| Zustand | State management |
| Axios | HTTP client |
| Socket.io-client | Real-time |
| Firebase SDK | Notifications, Auth |
| Google Maps SDK | Location services |

### Backend Development

| Library | Usage |
|---------|-------|
| Express | HTTP server |
| Mongoose | MongoDB ODM |
| BullMQ | Job queues |
| Socket.io | WebSocket |
| Jsonwebtoken | JWT auth |
| Bcrypt | Password hashing |
| Validator | Input validation |
| Winston | Logging |
| Pino | Fast logging |

### AI/ML

| Library | Usage |
|---------|-------|
| LangChain | AI orchestration |
| OpenAI SDK | OpenAI API |
| Anthropic SDK | Claude API |
| Transformers | Hugging Face |
| Langfuse | LLM observability |

---

## API Documentation

| Service | Documentation | Status |
|---------|---------------|--------|
| Payment API | See API_REFERENCE.md | Active |
| Auth API | See API_REFERENCE.md | Active |
| Order API | See API_REFERENCE.md | Active |
| Wallet API | See API_REFERENCE.md | Active |
| Catalog API | See API_REFERENCE.md | Active |
| Notification API | See API_REFERENCE.md | Active |

---

## Third-Party SDKs

| SDK | Version | Purpose |
|-----|---------|---------|
| @react-navigation/native | ^6.x | Navigation |
| zustand | ^4.x | State management |
| axios | ^1.x | HTTP client |
| mongoose | ^8.x | MongoDB ODM |
| express | ^4.x | HTTP server |
| bullmq | ^5.x | Job queues |

---

## Related Documentation

- [API Reference](../../API_REFERENCE.md)
- [Common Services](../1_COMMON_SERVICES/README.md)
- [Infrastructure](../5_INFRASTRUCTURE/README.md)

---

**Last Updated:** May 11, 2026
**Maintained By:** Claude Code
