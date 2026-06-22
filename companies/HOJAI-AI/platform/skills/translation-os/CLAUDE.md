# translation-os

> **Service:** Translation OS
> **Port:** 4866
> **Layer:** 5 (Communication Cloud — Channel Services)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Real-time translation across **Hindi / English / Spanish / Arabic** with a
built-in dictionary for common phrases + word-by-word fallback for unknown
tokens. Pluggable translation providers (Google / DeepL / Azure) for live
production use; mock provider keeps the service runnable offline.

Domain **glossaries** ensure brand names, product names, and technical
terms are never translated.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + supported languages + glossary count |
| GET | `/api/providers` | List providers + current |
| POST | `/api/providers/switch` | Switch provider |
| POST | `/api/translate` | Translate a single string |
| POST | `/api/translate/batch` | Batch translate array of strings |
| GET | `/api/dictionary/:sourceLang/:targetLang/:phrase` | Dictionary lookup |
| GET | `/api/glossaries` | List glossaries (3 seeded) |
| POST | `/api/glossaries` | Create a new glossary |

## Translation Modes

| Mode | When | Confidence | Example |
|------|------|------------|---------|
| `dictionary_exact` | Whole input matches a dict entry | 0.95 | `"hello"` → `"नमस्ते"` |
| `word_by_word` | Some tokens known | 0.30–0.85 | `"hello world please"` → `"hello world कृपया"` |
| `passthrough` | `from === to` | 1.00 | (no-op) |

Confidence formula: `max(0.3, min(0.85, knownHits/wordCount + 0.2))`

## Built-in Dictionary (9 phrases × 4 languages)

`hello`, `thank you`, `welcome`, `yes`, `no`, `please`, `help`, `sorry`, `goodbye`
across `en`, `hi`, `es`, `ar` — that's 36 translation pairs.

## Glossaries (3 seeded)

| Domain | Entries |
|--------|---------|
| `hospitality` | rtmn → RTMN, hojai → HOJAI, genie → Genie |
| `finance` | rtmn wallet → RTMN Wallet, revenue intelligence → Revenue Intelligence |
| `ecommerce` | order → Order, cart → Cart, checkout → Checkout |

Apply a glossary via `glossaryDomain` field in the translate request.

## Providers

| Provider | Mode | Required |
|----------|------|----------|
| `mock` | Local dict + word-by-word | None |
| `google` | Google Cloud Translation v3 | `GOOGLE_TRANSLATE_API_KEY` |
| `deepl` | DeepL API | `DEEPL_API_KEY` |
| `azure` | Azure Translator | `AZURE_TRANSLATOR_KEY` |

## Integration

- **ai-intelligence (4881)**: agent `translator` (translate, translate-batch, dictionary-lookup, glossary-list, glossary-create)
- **unified-os-hub (4399)**: `/api/translation/*` → service URL
- **Email OS (4862)**: can translate inbound emails before drafting reply
- **Genie Voice (4876)**: TTS in user's language
- **Customer Support OS**: can reply in customer's detected language

## Use Cases

1. Genie voice reply in Hindi/Spanish/Arabic based on user's language preference
2. Customer support email auto-translated to agent's working language
3. UI localization for Industry OS
4. Translation of support tickets before triage
5. Bulk translation of marketing copy for new regions
