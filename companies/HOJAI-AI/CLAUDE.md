# HOJAI-AI - VoiceOS + Voice Apps + Learning Platform

## Quick Start

```bash
# Start all voice services
cd /Users/rejaulkarim/Documents/RTMN
bash scripts/dev-stack.sh start

# Mobile (Expo)
cp products/voice-os/mobile/VoiceOSApp.ts your-expo-app/
cd your-expo-app && npx expo start

# Desktop
cd products/voice-os/desktop/voice-os-desktop && npm install && npm run dev
```

## Products

### VoiceOS (Wispr Flow Competitor)

| Product | Path | Status |
|---------|------|--------|
| Voice Gateway | products/voice-os/core/voice-gateway | Production |
| Voice Commands | products/voice-os/core/voice-commands | Production |
| Voice Hotkey | products/voice-os/core/voice-hotkey | Production |
| Voice Orchestrator | products/voice-os/core/voice-orchestrator | Production |
| Desktop App | products/voice-os/desktop/voice-os-desktop | Dev |
| Mobile App | products/voice-os/mobile/VoiceOSApp.ts | Dev |
| Landing | products/voice-os/landing | Dev |

### Learning OS

| Product | Path | Status |
|---------|------|--------|
| Learning OS | platform/company-os/learning-os | Dev |
| VoiceOS | products/voice-os | Production |

## Services (17 VoiceOS Services)

| Port | Service | Purpose |
|------|---------|---------|
| 4880 | voice-gateway | STT/TTS |
| 4885 | voice-commands | Wispr Flow commands |
| 4886 | voice-hotkey | Global hotkey |
| 4891 | conversation-physics | Turn management |
| 4892 | voice-director | Voice directives |
| 4893 | life-timeline | Life chapters |
| 4894 | voice-identity | Voice auth |
| 4895 | human-growth | Skills/habits |
| 4896 | human-presence | Energy/attention |
| 4897 | relationship-os | Trust/relationships |
| 4898 | voice-orchestrator | RAZO → Genie → VoiceOS |
| 4899 | app-detection | App context |
| 4701 | genie-gateway | Genie AI (48 services) |
| 4703 | memory-os | Memory (26 services) |

## Git Workflow

```bash
# Always use main branch
git checkout main
git add -A
git commit -m "feat: Add feature"
git push origin main

# Then update RTMN submodule
cd ../RTMN
git add companies/HOJAI-AI
git commit -m "chore: Update HOJAI-AI"
git push origin main
```

## Wispr Flow vs VoiceOS

| Feature | Wispr Flow | HOJAI VoiceOS |
|---------|-----------|----------------|
| Voice dictation | ✅ | ✅ |
| Global hotkey | ⌘⇧D | Alt+Space |
| Memory | ❌ | ✅ 26 services |
| Emotions | ❌ | ✅ Genie AI |
| Relationships | ❌ | ✅ Trust network |
| Mobile | ❌ | ✅ React Native |
| Desktop | Mac only | ✅ All platforms |
| Price | $15/mo | Free |

## Learning OS

Path: `platform/company-os/learning-os/`

Purpose: Skills, habits, learning paths

## Documentation

- products/voice-os/CLAUDE.md - VoiceOS docs
- products/voice-os/CLAUDE.md - VoiceOS overview
- platform/company-os/learning-os - Learning platform
