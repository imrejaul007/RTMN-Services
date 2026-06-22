# Personal Intelligence OS — Phase 4: Voice + Ambient

**Status:** 🟡 Planned (target: end of September 2026)
**Tagline:** *Genie is there before you ask.*

---

## What this phase ships

The "ambient intelligence" layer. Genie transitions from something you open to something that's just there.

| # | Feature | What it does |
|---|---------|--------------|
| 4.1 | Continuous listening mode (opt-in) | Genie listens in the background and surfaces relevant context when you ask — without you having to "open" it |
| 4.2 | Voice-first Genie | "Hey Genie" wake word → full voice interaction → Genie talks back, not just types |
| 4.3 | Ambient briefings (not just morning) | Evening recap, mid-day check-in, weekend preview, monthly review |
| 4.4 | Cross-device sync | Pick up a conversation on your phone that started on your laptop. Or your car. Or your watch. |

---

## Continuous listening mode

The existing `genie-wake-word-service` (port 4767) and `genie-listening-modes` (port 4768) are specialists that already exist. Phase 4 doesn't replace them — it adds a **Continuous Listening** mode that turns them from "active triggers" into "ambient observers."

### How it works

```
Audio stream (always-on, on-device)
    ↓
Wake word detection (existing: genie-wake-word-service)
    ↓
[if wake word] → full conversation mode
[if no wake word, but high-confidence ambient event] → silent capture
    ↓
Silent capture: Genie hears "remind me to..." or "I need to..."
    ↓
Stores in memory-substrate as "pending intent" (not yet acted on)
    ↓
When user next opens Genie: "I heard you mention calling the dentist. Want me to add a reminder?"
```

The key insight: **Genie doesn't act on what it hears passively. It waits for explicit confirmation.** This is the trust boundary.

### Use cases

- **Capturing forgettable moments** — "I need to remember to..." while cooking, hands full
- **Surfacing context** — user says "where did I park?" → Genie heard them say "level 3, near the entrance" 2 hours ago in a conversation
- **Relationship warmth** — hears user complain about a friend → gently checks in next morning

### Privacy

- **Default OFF.** User has to explicitly enable.
- **All processing on-device** by default. Audio never leaves the phone unless wake word is triggered.
- **Audit log in memory-substrate** — every passive capture is logged. User can review/delete.
- **Per-app kill switch** — don't listen during meetings, in sensitive apps, etc.
- **No raw audio retention** — only the extracted text is stored, and only if it passes the "useful" filter.

---

## Voice-first Genie

Right now voice is a specialist (`voice-twin` on 4876, plus `genie-wake-word-service`, `genie-listening-modes`, `genie-device-integration`). Phase 4 makes voice the **primary** interface for the new personal-intelligence features.

### The voice loop

```
"Hey Genie, how's my week looking?"
    ↓
[STT via voice-twin] → text
    ↓
[Intent Engine + Reasoning Engine] → "You have 12 events, 3 of which are meetings. Your biggest block is Wed afternoon — 4 hours straight. Want me to break it up?"
    ↓
[TTS via voice-twin] → audio
    ↓
[Optional: follow-up] "Yes, break up Wednesday" → executes
```

The voice flow uses the same Reasoning Engine from Phase 2 — it just changes the I/O.

### Multi-turn voice

Voice conversations need to handle:
- **Interruptions** — user can cut Genie off mid-sentence
- **Backchanneling** — "uh huh" doesn't end the turn
- **Ambiguity** — "schedule it for later" → Genie asks "later today, this week, or next week?"
- **Confirmation** — "are you sure?" before destructive actions

### Latency budget

| Stage | Target | Max |
|-------|--------|-----|
| Wake word → first audio byte | < 200ms | 500ms |
| STT (10s utterance) | < 800ms | 1.5s |
| Intent + routing (single-step) | < 500ms | 1s |
| Intent + routing (multi-step) | < 3s | 8s |
| TTS first byte | < 300ms | 700ms |
| **Total (single-step question)** | **< 2s** | **4s** |
| **Total (multi-step question)** | **< 5s** | **12s** |

---

## Ambient briefings

Right now there's `genie-briefing-service` (morning, evening, weekly) and `morning-briefing-v2` (LLM-composed morning). Phase 4 adds the **ambient** layer:

| Briefing | When | What's in it |
|----------|------|--------------|
| **Morning** (existing v2) | 7am user-local | Calendar, goals, relationships, wellness |
| **Mid-day check-in** (NEW) | 12:30pm | What's left today + 1 suggestion |
| **Evening recap** (NEW) | 9pm | What got done, what slipped, prep for tomorrow |
| **Weekend preview** (NEW) | Friday 6pm | What's open this weekend, 1 thing to look forward to |
| **Monthly review** (NEW) | 1st of month | Last month's PI Score delta, biggest wins, biggest misses |
| **Annual reflection** (NEW) | Jan 1 | Year in review (highlights from memory-substrate) |

### The mid-day check-in (the most important new one)

```
Good afternoon! You have 3 things left today:
1. "Q3 planning doc" (due 5pm) — 90 min estimated
2. "Review Reza's PR" (no deadline) — 15 min
3. "Call dentist" (overdue by 2 weeks) — 5 min

My take: skip the dentist today, you're slammed. The PR can wait until tomorrow. Focus on Q3.
```

This is **proactive intelligence that respects the user's flow**. It doesn't try to be everything. It surfaces 3 things, ranked.

---

## Cross-device sync

The existing `genie-device-integration` (port 4769) already supports phone, watch, earbuds, glasses, car. Phase 4 wires it to the new PI services so a conversation started on one device picks up on another.

### State model

- **Ephemeral state** (current conversation, audio buffers) — device-local
- **Session state** (mid-task context) — synced via realtime channel (websocket)
- **Persistent state** (memory, PI score, goals) — already in memory-substrate

### Realtime channel

Use existing SUTAR OS pub/sub (or a new lightweight websocket on port 4798). The runtime/genie emits events:
- `conversation.started` { deviceId, userId, sessionId }
- `conversation.message` { sessionId, role, content }
- `task.spawned` { sessionId, taskId, tool }
- `task.completed` { taskId, result }

Other devices subscribed to the same userId receive these events and can render the conversation in real-time.

### Car mode

The car is the highest-value ambient surface. 30-60 min/day, hands-free, eyes-free. Genie should:
- Surface what's coming up that day as user starts the car
- Handle "Hey Genie, navigate to my next meeting"
- Read the evening recap on the drive home (audio only)
- Detect "I'm tired" sentiment and suggest a different route home

---

## Success metrics

- **Voice DAU/WAU ratio** — > 30% of WAU use voice at least once
- **Continuous listening opt-in rate** — > 15% (we don't push it; growth should be organic)
- **Ambient briefing open rate** — Morning > 60%, Mid-day > 35%, Evening > 40%
- **Cross-device handoff** — > 20% of conversations happen on 2+ devices
- **Car mode** — if/when shipped, > 25% of users with car integration use it weekly

---

## Team (4 engineers)

| Engineer | Owns | Timeline |
|----------|------|----------|
| **Eng A** | Continuous listening (wake word + ambient capture pipeline) | Month 4 weeks 1-3 |
| **Eng B** | Voice-first Genie (multi-turn voice loop) | Month 4 weeks 1-3 |
| **Eng C** | Ambient briefings (mid-day, evening, weekend, monthly) | Month 4 weeks 2-4 |
| **Eng D** | Cross-device sync (realtime channel + device handoff) | Month 4 weeks 2-4 |
| **All** | Privacy controls + audit + per-user toggles | Month 4 week 4 |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Continuous listening creeps people out | Default OFF; clear privacy policy; one-tap kill switch; visible "listening" indicator |
| Voice latency kills the experience | Strict latency budget; pre-compute common answers; cache device-specific TTS |
| Ambient briefings become noise | Heavy opt-in; user picks which to enable; quiet hours respected |
| Cross-device sync drains battery | Use push (not poll); batch updates; per-device type settings |
| Car mode distracts drivers | Only audio output, no video; strict no-typing rule; car mode-specific safety review |

---

*Next: [PHASE-5-LIFE-OS-INTEGRATION.md](PHASE-5-LIFE-OS-INTEGRATION.md) — Month 5*
