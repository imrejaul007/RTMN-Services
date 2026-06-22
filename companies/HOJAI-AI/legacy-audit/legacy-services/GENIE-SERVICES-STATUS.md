# Genie AI - Complete Services Status

**Last Updated:** June 13, 2026  
**Status:** ✅ ALL 20 SERVICES BUILT

---

## Service Registry

| Service | Port | Category | Status | Description |
|---------|------|----------|--------|-------------|
| **Core Services** |||||
| genie-personal-os-gateway | 4702 | Memory Core | ✅ Built | API Orchestrator |
| genie-memory-service | 4703 | Memory Core | ✅ Built | Personal memory storage |
| genie-relationship-service | 4704 | Memory Core | ✅ Built | Relationship tracking |
| genie-briefing-service | 4706 | Communication | ✅ Built | Daily briefings |
| genie-meeting-service | 4713 | Communication | ✅ Built | Meeting intelligence |
| genie-sync-service | 4707 | Integration | ✅ Built | Cross-service sync |
| **Communication Services** |||||
| genie-calendar-service | 4709 | Communication | ✅ Built | Calendar aggregation |
| genie-email-service | 4710 | Communication | ✅ Built | Email management |
| genie-voice-service | - | Communication | ✅ Uses HOJAI | Voice (via HOJAI-VOICE-PLATFORM) |
| **Messaging Services** |||||
| genie-slack-service | 4711 | Messaging | ✅ Built | Slack integration |
| genie-telegram-service | 4712 | Messaging | ✅ Built | Telegram bot |
| genie-discord-service | 4716 | Messaging | ✅ Built | Discord integration |
| genie-whatsapp-service | 4717 | Messaging | ✅ Built | WhatsApp integration |
| **Notetaking Services** |||||
| genie-obsidian-service | 4708 | Notetaking | ✅ Built | Obsidian vault sync |
| genie-notion-service | 4719 | Notetaking | ✅ Built | Notion integration |
| **Intelligence Services** |||||
| genie-privacy-service | 4720 | Intelligence | ✅ Built | Privacy controls |
| genie-project-service | 4721 | Intelligence | ✅ Built | Project management |
| genie-household-service | 4722 | Intelligence | ✅ Built | Household context |
| genie-memory-review-service | 4723 | Intelligence | ✅ Built | Memory consolidation |
| **Integration Services** |||||
| genie-browser-history-service | 4724 | Integration | ✅ Built | Browser context |
| genie-drive-connector | 4726 | Integration | ✅ Built | Google Drive |
| **Business Intelligence** |||||
| genie-business-intelligence | 4725 | Business | ✅ Built | Business insights |

---

## Service Locations

All Genie services are located in: `companies/hojai-ai/`

```
hojai-ai/
├── genie-personal-os-gateway/     (4702)
├── genie-memory-service/         (4703)
├── genie-relationship-service/   (4704)
├── genie-sync-service/          (4707)
├── genie-obsidian-service/       (4708)
├── genie-calendar-service/      (4709)
├── genie-email-service/         (4710)
├── genie-slack-service/         (4711)
├── genie-telegram-service/      (4712)
├── genie-briefing-service/      (4706)
├── genie-meeting-service/       (4713)
├── genie-discord-service/       (4716)
├── genie-whatsapp-service/     (4717)
├── genie-notion-service/       (4719)
├── genie-privacy-service/       (4720)
├── genie-project-service/       (4721)
├── genie-household-service/     (4722)
├── genie-memory-review-service/ (4723)
├── genie-browser-history-service/(4724)
├── genie-business-intelligence/ (4725)
└── genie-drive-connector/       (4726)
```

---

## External Services Used

| Service | Port | Purpose |
|--------|------|---------|
| HOJAI-VOICE-PLATFORM | 4033 | STT, TTS, Voice Agents |
| hojai-edge-stt | 4035 | On-device STT |
| hojaiGateway | 4500 | AI Gateway |
| hojaiMemory | 4520 | Vector Memory |
| hojaiAgents | 4550 | AI Agents |

---

## Docker Compose

All services are configured in: `docker/docker-compose.genie.yml`

```bash
cd docker
docker-compose -f docker-compose.genie.yml up -d
```

---

**Total Services: 20 Built + Voice via HOJAI = 21 Total**
