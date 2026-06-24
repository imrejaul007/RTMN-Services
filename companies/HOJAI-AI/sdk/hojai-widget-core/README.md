# @hojai/widget-core

> **The 5KB vanilla JS snippet that turns any website into an AI front office.**

Drop the HOJAI Widget on any page to expose the company's SUTAR agents to visitors. The widget sends every visitor message through **intent classification → SUTAR agent delegation → natural-language reply** powered by the same runtime that runs inside every Nexha.

---

## Installation

### Method 1: HTML snippet (5 seconds)

```html
<script src="https://cdn.hojai.ai/widget.js"
        data-key="pk_live_abc123"
        data-company="maya-collective"
        data-color="#3B82F6"
        defer></script>
```

No build step. No npm. That's it.

### Method 2: npm (1 minute)

```bash
npm install @hojai/widget-core
```

```ts
import { HojaiWidget } from '@hojai/widget-core';

const widget = new HojaiWidget({
  apiKey: 'pk_live_abc123',
  companyId: 'maya-collective',
  config: {
    name: 'Maya Assistant',
    color: '#3B82F6',
    position: 'bottom-right',
    language: 'en'
  }
});

widget.render();
```

---

## Configuration

```ts
interface HojaiWidgetConfig {
  apiKey: string;             // Public key (pk_live_...)
  companyId: string;          // Your company identifier
  baseUrl?: string;           // Default: https://api.hojai.ai
  containerId?: string;       // CSS selector or HTMLElement. Default: floating bubble.
  config?: WidgetTheme;
  user?: { id?: string; name?: string; email?: string };
  visitorId?: string;         // Defaults to localStorage-backed id
  debug?: boolean;
}

interface WidgetTheme {
  name?: string;              // Default: "HOJAI Assistant"
  avatar?: string;            // URL
  color?: string;             // Default: "#3B82F6"
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  language?: string;          // ISO code, default "en"
  greeting?: string;
  voice?: { enabled?: boolean };
}
```

---

## API

| Method | Purpose |
|---|---|
| `widget.render()` | Mount the chat bubble in the DOM |
| `widget.destroy()` | Tear it down |
| `widget.open()` | Open the chat panel |
| `widget.close()` | Close the chat panel |
| `widget.send(text)` | Send a message programmatically |
| `widget.on('message', fn)` | Subscribe to events (`message`, `response`, `open`, `close`, `error`) |
| `widget.getHistory()` | Get conversation history |
| `widget.identify(user)` | Identify a logged-in user (for memory) |

---

## What happens when a visitor types

```
Visitor types "Show me black hoodies under ₹2500"
  ↓
Widget → POST {baseUrl}/api/v1/widget/message
  ↓
Widget backend classifies intent (intent: "product_search")
  ↓
Enriches with REZ Intelligence (customer insights, recommendations)
  ↓
Routes to SUTAR Sales Agent (or Booking/Support/Commerce)
  ↓
Agent executes the task against company systems
  ↓
Response streams back to the widget
```

---

## Size budget

Target: **≤ 5 KB minified + gzipped**

The core has zero runtime dependencies and uses only native browser APIs. Production builds land around **4.5 KB gzipped**.

---

## Files

```
hojai-widget-core/
├── package.json
├── README.md
├── tsconfig.json (CommonJS build)
├── tsconfig.esm.json (ESM build)
├── tsconfig.test.json (test build)
├── src/
│   ├── index.ts            # Public API
│   └── snippet.js          # Auto-init from <script data-key=...>
└── snippet.html            # Copy-paste snippet for users
```

---

## See also

- [HOJAI Widget Spec](../../../../../../.claude/plans/hojai-widget-spec.md) — Full product spec
- [@hojai/widget-react](../hojai-widget-react/) — React wrapper
- [@hojai/foundation](../hojai-foundation/) — Foundation SDK
- [@hojai/sutar](../hojai-sutar/) — SUTAR agent runtime
