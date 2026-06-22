# meeting-os

> **Service:** Meeting OS
> **Port:** 4864
> **Layer:** 5 (Communication Cloud — Channel Services)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

End-to-end meeting intelligence: schedule with conflict detection, transcription
(pluggable provider), and structured extraction (action items, decisions, summary).

Designed to plug into transcription providers without API keys via `mock` mode.
Extraction heuristics work fully offline — they don't depend on an LLM.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts + provider status |
| GET | `/api/transcription/providers` | List transcription providers + current |
| POST | `/api/transcription/providers/switch` | Switch transcription provider |
| POST | `/api/meetings/schedule` | Schedule a meeting (conflict-checked) |
| GET | `/api/meetings` | List meetings (filter by participant/status/date) |
| GET | `/api/meetings/:id` | Get one meeting |
| PATCH | `/api/meetings/:id` | Update meeting fields |
| POST | `/api/meetings/:id/cancel` | Cancel meeting |
| POST | `/api/meetings/check-conflicts` | Check conflicts without booking |
| POST | `/api/meetings/:id/transcript` | Ingest transcript (segments or plain text or audio URL) |
| POST | `/api/meetings/:id/extract` | Run action-item / decision / summary extraction |
| GET | `/api/action-items` | List action items (filter by owner/meeting/status) |
| PATCH | `/api/action-items/:id` | Update action item |
| GET | `/api/participants` | List known participants |

## Scheduling

- Auto-generates a `https://meet.rtmn.ai/<id>` join link
- Conflict detection: finds any existing meeting that overlaps in time with any of the same participants
- Timezone-aware via `timezone` field

## Transcription Providers

| Provider | Mode | Required |
|----------|------|----------|
| `mock` | Passthrough with timestamps | None |
| `whisper` | OpenAI Whisper (local or API) | `OPENAI_API_KEY` |
| `deepgram` | Deepgram streaming | `DEEPGRAM_API_KEY` |
| `otter` | Otter.ai Speech API | `OTTER_API_KEY` |

## Extraction (heuristic, runs offline)

After transcript is ingested, `POST /api/meetings/:id/extract` returns:

- **actionItems**: sentences with action keywords (`will`, `should`, `let's`, `must`, `by <day>`). Owner extracted from `<Name> will...` patterns. Due date extracted from `by Monday`, `next week`, etc.
- **decisions**: sentences with decision keywords (`decided`, `agreed`, `concluded`, `consensus`, `approved`).
- **summary**: extractive — first sentence + sentences with importance keywords, capped at 3 sentences.

## Integration

- **ai-intelligence (4881)**: agent `meetingAssistant` (schedule, check-conflicts, cancel, ingest-transcript, extract-actions, extract-decisions, summarize)
- **unified-os-hub (4399)**: `/api/meeting/*` → service URL
- **Genie Calendar (4709)**: complementary — calendar stores events; meeting-os adds AI on top

## Use Cases

1. Schedule team meetings with conflict awareness
2. Transcribe customer calls (manual upload or audio URL)
3. Auto-extract action items after a sales call
4. Quarterly board meeting summary
5. Customer discovery call → action items routed to project tracker
