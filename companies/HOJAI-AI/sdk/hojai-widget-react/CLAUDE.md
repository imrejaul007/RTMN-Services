# @hojai/widget-react — React Wrapper for the HOJAI Widget

> **Package:** `@hojai/widget-react` v1.0.0
> **TypeScript:** First-class with React 17/18 types
> **Runtime:** Browser only (uses React + DOM)
> **Status:** ✅ **PRODUCTION-READY** — Built on top of `@hojai/widget-core`.

---

## What this SDK is

**React wrapper for the 5KB HOJAI widget.** Drop `<HojaiChat />` in any React app to add an AI front-office chat powered by SUTAR agents.

- Browser-only (depends on `window`, `document`, DOM)
- Thin React layer over `@hojai/widget-core` (which does the heavy lifting)
- Two surface areas: `<HojaiChat>` component + `useHojaiWidget()` hook
- Imperative handle via `ref` for programmatic control (`send`, `open`, `close`, `getHistory`, `identify`)

---

## Quick Start

```bash
npm install @hojai/widget-react @hojai/widget-core
```

```tsx
import { HojaiChat } from '@hojai/widget-react';

function App() {
  return (
    <>
      <h1>My Store</h1>
      <HojaiChat
        apiKey="pk_live_xxxx"
        companyId="my-store"
        config={{ name: 'My Assistant', color: '#FF6B6B' }}
      />
    </>
  );
}
```

---

## Components & Hooks

### `<HojaiChat>` — declarative component

```tsx
import { HojaiChat, HojaiChatHandle } from '@hojai/widget-react';
import { useRef } from 'react';

function App() {
  const chatRef = useRef<HojaiChatHandle>(null);

  return (
    <>
      <button onClick={() => chatRef.current?.send('Hello!')}>
        Send hello
      </button>
      <HojaiChat
        ref={chatRef}
        apiKey="pk_live_xxxx"
        companyId="my-store"
        config={{ name: 'My Assistant', color: '#FF6B6B', position: 'bottom-right' }}
        onMessage={(m) => console.log('user said:', m.text)}
        onResponse={(m) => console.log('agent replied:', m.text)}
        onError={(err) => console.error('widget error:', err)}
        onOpen={() => console.log('chat opened')}
        onClose={() => console.log('chat closed')}
        className="my-chat"
        style={{ minHeight: 0 }}
      />
    </>
  );
}
```

### `useHojaiWidget()` — hook for programmatic control

```tsx
import { useHojaiWidget } from '@hojai/widget-react';

function ChatPanel() {
  const { widget, send, open, close, getHistory } = useHojaiWidget({
    apiKey: 'pk_live_xxxx',
    companyId: 'my-store'
  });

  return (
    <div>
      <button onClick={() => open()}>Open</button>
      <button onClick={() => send('Hello!')}>Send hello</button>
      <button onClick={() => close()}>Close</button>
    </div>
  );
}
```

---

## Props

### `HojaiChatProps` (extends `HojaiWidgetConfig`)

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | string | yes | HOJAI API key |
| `companyId` | string | yes | Your company/tenant identifier |
| `config` | `HojaiWidgetConfig` | no | Widget configuration (theme, position, etc.) |
| `className` | string | no | CSS class for the container |
| `style` | `React.CSSProperties` | no | Inline style for the container |
| `onMessage` | `(message) => void` | no | User-sent message callback |
| `onResponse` | `(message) => void` | no | Agent response callback |
| `onError` | `(error: Error) => void` | no | Widget error callback |
| `onOpen` | `() => void` | no | Chat opened callback |
| `onClose` | `() => void` | no | Chat closed callback |

### `HojaiChatHandle` (imperative ref)

| Method | Description |
|---|---|
| `send(text)` | Send a message, returns a Promise with the response |
| `open()` | Open the chat panel |
| `close()` | Close the chat panel |
| `getHistory()` | Get the message history |
| `identify(user)` | Identify the end-user |

---

## Build

```bash
npm install
npm run build
npm test
```

Outputs dual builds (CJS + ESM) for maximum compatibility.

---

## Files

```
hojai-widget-react/
├── CLAUDE.md               # This file
├── package.json            # @hojai/widget-react v1.0.0
├── tsconfig.json
├── tsconfig.cjs.json
├── tsconfig.esm.json
├── tsconfig.test.json
├── src/
│   ├── index.tsx            # HojaiChat component + useHojaiWidget hook
│   └── __tests__/
│       └── index.test.tsx   # Module exports + HojaiWidget re-export + SSR
└── dist/                   # Compiled output (CJS + ESM)
```

---

## Related

- **[@hojai/widget-core](../hojai-widget-core/CLAUDE.md)** — the underlying 5KB vanilla JS widget
- **[HOJAI Widget docs](../../../docs/widget/)** — full widget guide
- **[Widget Snippet](snippet.html)** — 5-second HTML install (no build needed)

---

*Built as the React surface for the HOJAI Widget.*