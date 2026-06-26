# genie-spatial — Phase 25 AR/VR

**Phase:** Phase 25 (Final)
**Status:** ✅ Built (2026-06-25)
**Port:** none (frontend-only)

## What is this?

genie-spatial provides a WebXR/React-Three-Fiber spatial interface for Genie AI — a holographic 3D companion that lives in AR or VR.

## Components

### `<GenieSpatialOverlay>`

Main component. Renders a 3D holographic Genie avatar (transmission-material glass orb + orbital rings + status dots) in a Three.js Canvas, with a 2D glassmorphism message list and input panel overlaid on top.

```tsx
import { GenieSpatialOverlay } from './src/components/SpatialOverlay';

<GenieSpatialOverlay
  messages={[{ role: 'user', text: 'Hello' }, { role: 'genie', text: 'Hi!' }]}
  isThinking={false}
  inputValue={input}
  onInputChange={setInput}
  onSend={handleSend}
/>
```

## Features

- **Holographic Genie Avatar**: Glass orb with transmission material, orbital rings, pulsing status dots
- **Ambient Particles**: 200 floating particles with slow rotation
- **AR Mode**: WebXR immersive-ar support (requires WebXR-capable browser/device)
- **Flat Mode**: Works in any browser as a 3D canvas fallback
- **Glassmorphism UI**: Frosted glass message bubbles + input panel
- **Accessibility**: aria-label on all interactive elements
- **Spatial Context**: React Context with mode, session start/end

## Development

```bash
cd genie-spatial
npm install
npm run dev
```

Requires: Node 18+, React 18+

## Architecture

```
genie-spatial/
├── src/
│   └── components/
│       └── SpatialOverlay.tsx  # Main component (all-in-one)
├── package.json
└── CLAUDE.md
```

## Integration

Import into any React app. Works standalone or embedded in the genie-os web frontend.
For production WebXR, add `@react-three/xr` and wire `Xr.session` to the Canvas.
