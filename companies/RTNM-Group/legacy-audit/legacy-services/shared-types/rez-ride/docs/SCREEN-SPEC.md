# ReZ Ride — Vehicle Screen Specification

## Overview

Every registered vehicle on ReZ Ride is equipped with a mounted screen that displays intent-targeted advertisements to passengers. This document specifies the hardware requirements, software, and behavior.

---

## Screen Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     REZ RIDE SCREEN                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                    AD CONTENT                          │   │
│  │                                                         │   │
│  │    [Image/Video]                                        │   │
│  │                                                         │   │
│  │    Product/Service Title                                │   │
│  │    Brief description text                              │   │
│  │                                                         │   │
│  │    [Tap for more]                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────────────┐                    ┌────────────────┐   │
│  │ ReZ Logo          │                    │ 00:30          │   │
│  │ "Rides that pay   │                    │ remaining      │   │
│  │  you back"        │                    │                │   │
│  └───────────────────┘                    └────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hardware Specifications

### Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Display Size** | 10" | 10" - 15" |
| **Resolution** | 1280×720 (720p) | 1920×1080 (1080p) |
| **Touch** | Capacitive touchscreen | Capacitive touchscreen |
| **Processor** | Quad-core 1.3GHz | Octa-core 2.0GHz |
| **RAM** | 2GB | 4GB |
| **Storage** | 8GB | 32GB |
| **Connectivity** | 4G LTE | 4G LTE + WiFi |
| **GPS** | Built-in GPS | Built-in GPS |
| **Power** | 12V DC / USB-C | 12V DC / USB-C |
| **Mount** | Adjustable mount | Adjustable mount |

### Screen Options

#### Option A: Android Tablet (Recommended for MVP)

```
RECOMMENDED: Samsung Galaxy Tab A8 / Lenovo Tab M10 / Amazon Fire HD 10

Pros:
• Readily available
• Easy to replace
• App ecosystem
• Touch-enabled
• GPS built-in

Cons:
• Consumer-grade durability
• Screen mount issues
• Battery management
```

#### Option B: Dedicated Device

```
PURPOSE-BUILT: Autel / Parst / Joying Android Car Stereo

Pros:
• Car-grade components
• Better mounting options
• Hardwired power
• Professional look

Cons:
• Higher cost
• Limited availability
• Custom development
```

#### Option C: Smart Display

```
ALTERNATIVE: Amazon Fire HD / Lenovo Smart Display

Pros:
• Cheapest option
• Voice assistant built-in
• Easy to set up

Cons:
• Limited app support
• No GPS (for some models)
• Consumer-grade
```

### Mounting Options

```
MOUNT TYPES:

1. Windshield Mount
   • Suction cup base
   • Adjustable arm
   • Viewed by front passenger

2. Headrest Mount
   • Clamps to headrest posts
   • Better passenger viewing angle
   • Requires headrest-compatible case

3. Dashboard Mount
   • Adhesive base
   • Low profile
   • Fixed position

RECOMMENDED: Headrest mount for passenger experience
```

---

## Software Specification

### Supported OS

```
PRIMARY: Android 10+ (API 29+)
FALLBACK: Android 9 (API 28) if necessary
NOT SUPPORTED: iOS, Windows
```

### Screen App Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCREEN APP LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    UI LAYER                              │   │
│  │  • React Native / React / WebView                        │   │
│  │  • Ad display components                                 │   │
│  │  • Driver info overlay                                   │   │
│  │  • State indicators                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  STATE MANAGEMENT                        │   │
│  │  • Current state (available, riding, etc.)               │   │
│  │  • Active ad content                                    │   │
│  │  • Driver/ride info                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SERVICE LAYER                          │   │
│  │  • WebSocket connection                                  │   │
│  │  • HTTP sync (fallback)                                 │   │
│  │  • Local caching                                        │   │
│  │  • Offline queue                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 DEVICE LAYER                             │   │
│  │  • Screen brightness control                             │   │
│  │  • GPS location reporting                                │   │
│  │  • Battery monitoring                                    │   │
│  │  • Network status                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### App States

```
┌─────────────────────────────────────────────────────────────────┐
│ SCREEN APP STATES │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. BOOT │
│    └── Show ReZ splash screen │
│    └── Initialize services │
│    └── Connect to backend │
│    └── → AVAILABLE or OFFLINE │
│ │
│ 2. AVAILABLE │
│    └── "Available for rides" message │
│    └── Driver info (if any) │
│    └── Heartbeat to backend │
│    └── → RIDE_INCOMING or OFFLINE │
│ │
│ 3. RIDE_INCOMING │
│    └── "New ride request" (driver view) │
│    └── Pickup/drop preview │
│    └── Wait for driver action │
│    └── → NAVIGATING or AVAILABLE │
│ │
│ 4. NAVIGATING │
│    └── "Picking up passenger" │
│    └── Pickup location │
│    └── ETA │
│    └── → PASSENGER_JOINED │
│ │
│ 5. PASSENGER_JOINED │
│    └── Ad mode activated │
│    └── Show personalized ad │
│    └── Start impression tracking │
│    └── → IN_RIDE │
│ │
│ 6. IN_RIDE │
│    └── Full-screen ad │
│    └── Destination shown │
│    └── ETA │
│    └── Impression tracking │
│    └── → RIDE_COMPLETE │
│ │
│ 7. RIDE_COMPLETE │
│    └── "Ride complete" message │
│    └── Thank passenger │
│    └── → AVAILABLE │
│ │
│ 8. OFFLINE │
│    └── "Screen offline" message │
│    └── Contact support │
│    └── Retry connection │
│    └── → BOOT │
│ │
└─────────────────────────────────────────────────────────────────┘
```

### Screen States (Visual)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AVAILABLE     │───▶│ RIDE_INCOMING  │───▶│  NAVIGATING     │
│                 │    │                │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  ReZ Logo  │ │    │ │   ReZ Logo  │ │    │ │   ReZ Logo  │ │
│ │             │ │    │ │             │ │    │ │             │ │
│ │  Available │ │    │ │  New Ride  │ │    │ │  Picking up │ │
│ │  for rides │ │    │ │   Request   │ │    │ │  passenger  │ │
│ │             │ │    │ │             │ │    │ │             │ │
│ │ Driver Name │ │    │ │ Pickup:    │ │    │ │ Pickup:     │ │
│ │ Vehicle No  │ │    │ │ MG Road    │ │    │ │ MG Road     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IN_RIDE       │───▶│ RIDE_COMPLETE  │───▶│   AVAILABLE     │
│                 │    │                │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   [AD]      │ │    │ │   ReZ Logo  │ │    │ │   ReZ Logo  │ │
│ │             │ │    │ │             │ │    │ │             │ │
│ │ Product     │ │    │ │  Thank you  │ │    │ │  Available  │ │
│ │ Title       │ │    │ │  for riding │ │    │ │  for rides │ │
│ │             │ │    │ │  with ReZ   │ │    │ │             │ │
│ │ Tap for     │ │    │ │             │ │    │ │ Driver Name │ │
│ │ more →      │ │    │ │ ₹15 earned  │ │    │ │ Vehicle No  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Connectivity

### Primary: WebSocket

```typescript
// Real-time communication
const ws = new WebSocket(`wss://api.rezapp.com/screens/${deviceId}/connect`);

// Keep-alive
setInterval(() => {
  ws.send(JSON.stringify({ type: 'heartbeat' }));
}, 30000); // 30 seconds
```

### Fallback: HTTP Polling

```typescript
// If WebSocket fails, poll HTTP
setInterval(async () => {
  const response = await fetch(`${API}/screens/${deviceId}/status`);
  const data = await response.json();
  updateScreen(data);
}, 10000); // 10 seconds
```

---

## Ad Formats

### 1. Hero Image (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    [Image: 1920×1080]                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │                   PRODUCT NAME                            │ │
│  │                                                           │ │
│  │              Brief compelling tagline                      │ │
│  │                                                           │ │
│  │                    ₹XXX only                             │ │
│  │                                                           │ │
│  │                  [Tap for more →]                         │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [ReZ Logo]                                    [00:15]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Duration: 15-30 seconds
```

### 2. Video Ad

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    [Video: 1920×1080]                           │
│                                                                 │
│           ┌────────────────────────────────┐                    │
│           │         ▶ PLAY                │                    │
│           └────────────────────────────────┘                    │
│                                                                 │
│                     Brand Name                                   │
│                                                                 │
│                  [Tap for more →]                                │
│                                                                 │
│  [ReZ Logo]                                    [00:30]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Duration: 15-30 seconds (skippable after 5s)
```

### 3. Promo Card

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │                       │  │                               │  │
│  │   [Product Image]     │  │   HOT DEAL                    │  │
│  │                       │  │                               │  │
│  │                       │  │   Product Title               │  │
│  │                       │  │                               │  │
│  │                       │  │   ₹299 only                   │  │
│  │                       │  │   (Was ₹499)                  │  │
│  │                       │  │                               │  │
│  │                       │  │   [Order Now →]               │  │
│  │                       │  │                               │  │
│  └───────────────────────┘  └───────────────────────────────┘  │
│                                                                 │
│  [ReZ Logo]                                    [persistent]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Duration: Until ride ends or new ad
```

---

## Impression Tracking

### Impression Event

```typescript
interface ImpressionEvent {
  ad_id: string;
  ride_id: string;

  // Timing
  served_at: string;        // ISO timestamp
  duration: number;         // seconds viewed

  // Interaction
  interacted: boolean;
  interaction_type?: 'tap' | 'swipe';

  // Device
  device_id: string;
  network: '4g' | 'wifi';
  battery_level: number;
}
```

### Tracking Logic

```
┌─────────────────────────────────────────────────────────────────┐
│ IMPRESSION TRACKING LOGIC │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. AD SERVED │
│    └── Record: served_at, ad_id │
│ │
│ 2. DURING VIEWING │
│    └── Track: view_duration every 5 seconds │
│    └── Detect: screen still visible? │
│ │
│ 3. AD INTERACTION │
│    └── User taps → record interaction │
│    └── Deep link opened │
│ │
│ 4. AD COMPLETE │
│    └── If duration >= minimum_view_time (5s) │
│    └── Record as valid impression │
│    └── Send to backend │
│ │
│ 5. NEXT AD │
│    └── Serve next ad │
│    └── Repeat │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Offline Behavior

### When Offline

```
┌─────────────────────────────────────────────────────────────────┐
│ OFFLINE BEHAVIOR │
├─────────────────────────────────────────────────────────────────┤
│ │
│ Screen Detection: │
│ └── No network for 60+ seconds │
│ │
│ Display: │
│ └── "Screen offline - Contact support" │
│ └── Show driver contact number │
│ │
│ Actions: │
│ └── Retry connection every 30 seconds │
│ └── Queue any pending impression logs │
│ └── Play cached ads if available │
│ │
│ Recovery: │
│ └── When network returns │
│ └── Sync queued data │
│ └── Resume normal operation │
│ │
└─────────────────────────────────────────────────────────────────┘
```

### Cached Content

```
CACHE STRATEGY:

CACHE AD CREATIVES:
├── Last 10 served ads
├── 100MB max cache
└── LRU eviction

CACHE DRIVER INFO:
├── Current driver details
└── Refresh on each ride

CACHE APP STATE:
├── Last state machine state
└── Restore on reboot
```

---

## Maintenance & Monitoring

### Health Metrics

```typescript
interface ScreenHealth {
  device_id: string;
  timestamp: string;

  // Connectivity
  online: boolean;
  network_type: '4g' | 'wifi' | 'offline';
  signal_strength?: number;

  // Power
  battery_level: number;
  charging: boolean;

  // Storage
  storage_used_mb: number;
  storage_available_mb: number;

  // App
  app_version: string;
  last_update: string;
  crash_count_today: number;

  // Screen
  brightness: number;
  display_on: boolean;
}
```

### Uptime Tracking

```
UPTIME_CALCULATION:

Valid ride time: Ride duration when screen was online and showing ads
Required uptime: 70% of ride time

Example:
├── Ride duration: 20 minutes
├── Required: 14 minutes of ad display
├── Actual: 15 minutes
├── Compliance: 100% (approved)
└── Ad revenue: 100%
```

---

## Security

### Device Authentication

```
AUTHENTICATION:
├── Device registered with unique ID
├── JWT token for API calls
├── Token refresh every 24 hours
└── Device bound to specific driver/vehicle
```

### Data Protection

```
ON DEVICE:
├── No PII stored locally
├── Encrypted storage
├── Auto-wipe after 5 failed auth attempts

TRANSMISSION:
├── TLS 1.3
├── Certificate pinning
└── Request signing
```

---

## Installation Guide

### Physical Installation

```
STEPS:
1. Choose mount location (headrest recommended)
2. Clean mounting surface
3. Attach mount
4. Secure device
5. Connect power (USB or 12V adapter)
6. Route cables neatly
7. Test device boots correctly
8. Calibrate screen
9. Verify GPS signal
10. Test network connection
```

### App Setup

```
FIRST TIME SETUP:
1. Boot device
2. Connect to WiFi (initial setup)
3. Enter device registration code
4. Pair with driver account
5. Verify screen appears in dashboard
6. Update to latest app version
7. Complete!
```
