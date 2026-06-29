# VoiceOS - Wispr Flow Competitor

## Quick Start

```bash
# Start all voice services
cd /Users/rejaulkarim/Documents/RTMN
bash scripts/dev-stack.sh start

# Build desktop app
cd products/voice-os/desktop/voice-os-desktop
npm install && npm run dev
```

## Architecture

```
VoiceOS (12-layer stack)
├── Layer 1-12: All services
├── Memory: Hot/Warm/Cold memory
├── Genie: 48 services
└── Desktop: Electron app + landing
```

## Services (17 total)

| Port | Service | Purpose |
|------|---------|---------|
| 4880 | voice-gateway | STT/TTS |
| 4885 | voice-commands | Wispr Flow commands |
| 4886 | voice-hotkey | Global hotkey |
| 4891-4899 | 9 VoiceOS services | Core |
| 4701 | genie-gateway | Genie AI |
| 4703 | memory-os | Memory layer |

## Commands

```bash
# Start all
bash scripts/dev-stack.sh start

# VoiceOS services
cd products/voice-os/core/voice-commands && npm start
cd products/voice-os/core/voice-orchestrator && npm start
```

## Key Features

- Global hotkey: Alt+Space
- Voice commands: "new line", "delete that", "make shorter"
- Memory: Remembers preferences
- Emotional: Detects mood
- Relationships: Knows mom vs boss

## Wispr Flow vs VoiceOS

| Wispr Flow | VoiceOS |
|------------|---------|
| $15/mo | Free |
| Mac only | All platforms |
| No memory | Full memory |
| Basic AI | Genie AI |
| No relationships | Context aware |

## Files

```
products/voice-os/
├── core/voice-commands/     # Wispr Flow commands
├── core/voice-orchestrator/ # Main pipeline
├── core/voice-hotkey/       # Global shortcuts
├── desktop/voice-os-desktop/ # Electron app
└── landing/                # Demo page
```

## Commit

```bash
git add products/voice-os
git commit -m "feat(voice-os): Complete"
git push origin main
```

---

*For full docs, see VOICE-OS-COMPLETE.md*
