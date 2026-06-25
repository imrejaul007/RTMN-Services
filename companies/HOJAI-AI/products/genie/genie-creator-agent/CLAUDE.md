# genie-creator-agent — Creator Agent (D5)

> **Port:** 4743  
> **Tagline:** *Your content studio. Drafts, templates, and a publishing calendar.*  
> **Pairs with:** Marketing OS / Media OS

## What it does

The Creator Agent is a **content creation workspace** with reusable templates, a drafts pipeline, and a publishing calendar. Pairs with Marketing OS (campaigns) and Media OS (videos/podcasts) — the Creator Agent is where you actually write the content.

## Endpoints

```
GET    /health
GET    /                                          — banner + endpoint list
GET    /templates                                 — list all templates
GET    /templates/:templateId                     — template detail
GET    /drafts/by-user/:userId                    — list user's drafts
POST   /drafts/by-user/:userId                    — create draft
GET    /drafts/:draftId                           — draft detail
PATCH  /drafts/:draftId                           — update (title, body, status, tags)
DELETE /drafts/:draftId                           — delete draft
POST   /drafts/:draftId/publish                   — mark published
GET    /calendar/by-user/:userId                  — publishing calendar
POST   /calendar/by-user/:userId                  — schedule content
GET    /stats/:userId                             — counts (by status, by channel, total words)
```

## Statuses

- `draft` — working copy
- `in-review` — ready for feedback
- `published` — live
- `archived` — no longer in use

## Channels

`blog`, `twitter`, `instagram`, `youtube`, `podcast`, `email`, `linkedin`, `tiktok`, `other`

## Seeded Data

### Templates (6)
- **tpl-blog** — Blog Post (1500 words, hook + 3-5 sections + CTA)
- **tpl-twitter** — Twitter Thread (7-10 tweets, one idea per tweet)
- **tpl-instagram** — Instagram Caption (150-300 words, hook + story + CTA)
- **tpl-video** — YouTube Video Script (8-15 min, intro hook + body + outro)
- **tpl-podcast** — Podcast Episode Outline (30-60 min, segments + questions)
- **tpl-newsletter** — Email Newsletter (500-800 words, 3-5 items + deeper dive)

### Drafts (4)
- Why founders should learn to code (blog, draft)
- 5 lessons from launching in 30 days (twitter, in-review)
- A morning routine that works (instagram, draft)
- How we hit 1K users in week 1 (newsletter, **published**)

### Calendar (3)
- Blog publish in 2 days
- Twitter thread in 4 days
- Newsletter sent 3 days ago (published)

## Stores (4 PersistentMaps)

| Store | Purpose |
|-------|---------|
| `templates` | Reusable content formats (blog, thread, video, etc.) |
| `drafts` | Working content with body, status, wordCount |
| `calendar` | Scheduled content (date + channel + draft link) |
| `assets` | Generated content metadata (image prompts, captions) |

## Run

```bash
PORT=4743 JWT_SECRET=... node src/index.js
```

## Tests

```bash
JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4743 node --test tests/creator-readiness.test.mjs
# 25 tests, 0 failures

JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4743 node src/index.js &
JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4743 bash tests/smoke.sh
# 27 smoke checks pass
```

## Status

✅ **D5 Complete** (Phase D — Agent gaps). Built 2026-06-25.
