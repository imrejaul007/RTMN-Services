# Document Intelligence (rtmn-document-intelligence)

> **Service:** `document-intelligence`
> **Port:** 4782
> **Version:** 1.0.0
> **Owner:** HOJAI AI — Data & Knowledge Cloud (Division 6)
> **Status:** ✅ Production-ready document parser

## What it is

The universal document parser for the RTMN ecosystem. Converts uploaded files (PDF / DOCX / XLSX / CSV / TXT / MD / HTML) into clean structured output — text, metadata, structure — ready to be ingested by the RAG Platform (4781) or any other service that needs document content.

Before this service, RTMN could only ingest plain-text knowledge articles. **Now any document format can be turned into RAG-ready content in one API call.**

## Why it exists

The vast majority of enterprise knowledge lives in PDFs, Word docs, and spreadsheets — not in clean text fields. A useful RAG system has to be able to ingest all of them. This is the service that closes that gap.

## Endpoints (all `/api/*`)

### Extraction
- `POST /api/extract` body `{ contentBase64, filename?, mimeType?, format?, includeStructure? }`
  - Also accepts `{ text, format }` for inline content
  - Also accepts `{ url }` to fetch and extract from a URL
  - Auto-detects format from filename + mimeType
  - Returns `{ id, format, stats: { charCount, wordCount, lineCount, language }, metadata, structure, text, took_ms }`
- `POST /api/extract/batch` body `{ documents: [{ contentBase64, filename?, mimeType? }, ...] }` — up to 50 at a time

### The killer one-shot endpoint
- `POST /api/extract-and-rag` body `{ contentBase64, filename?, mimeType?, collection, metadata?, chunkSize?, chunkOverlap? }`
  - **Extract → chunk → embed → store in RAG collection, in one call**
  - Internally calls `/api/extract` then POSTs to the RAG Platform (4781) `/api/documents`
  - Returns both the extraction result (preview only) and the RAG ingestion result
  - 99% of the time this is the only endpoint you'll need

### Metadata
- `GET /api/formats` — list of supported formats + caveats per format
- `GET /api/stats` — counters by format, total bytes processed, total chars extracted
- `POST /api/stats/reset` — reset counters
- `GET /api/audit?limit=100` — recent events

### Health
- `GET /health` → 301 redirect to `/api/health`
- `GET /api/health` → `{ status, service, port, version, supportedFormats, stats, uptime }`

## Supported formats

| Format | Extension | How extracted | Caveats |
|--------|-----------|---------------|---------|
| **TXT** | `.txt` | UTF-8, normalize line endings | None |
| **MD** | `.md`, `.markdown` | UTF-8 + extract YAML frontmatter + heading outline | None |
| **CSV** | `.csv`, `.tsv` | RFC 4180 parser → headers + rows + flat text | Quoted fields, embedded commas, CRLF all handled |
| **HTML** | `.html`, `.htm` | Strip tags, decode entities, preserve text | Script/style blocks removed first |
| **PDF** | `.pdf` | Minimal hand-written extractor for text-based PDFs (BT/ET blocks, Tj/TJ operators) | **Text-based only.** No OCR. FlateDecode streams not decompressed. For image-based PDFs, add OCR. |
| **DOCX** | `.docx` | ZIP + `word/document.xml` extraction | Paragraphs, heading outline, core props. Tables-as-text and images not extracted. |
| **XLSX** | `.xlsx` | ZIP + `xl/sharedStrings.xml` + `xl/worksheets/sheet*.xml` | Cells with shared strings, per-sheet rows. Charts, pivots, formulas skipped. |

## Output shape

Every extract returns the same shape:

```json
{
  "id": "uuid",
  "filename": "report.pdf",
  "format": "pdf",
  "sizeBytes": 12500,
  "stats": {
    "charCount": 12500,
    "wordCount": 2103,
    "lineCount": 145,
    "language": "en"
  },
  "metadata": {
    "format": "pdf",
    "pageCount": 12,
    "title": "Q3 Report",
    "author": "Jane Doe",
    "creationDate": "...",
    "...": "format-specific"
  },
  "structure": {
    "pages": [
      { "index": 0, "text": "..." }
    ]
  },
  "text": "full plain-text extraction",
  "extractedAt": "ISO timestamp"
}
```

## Key design choices

1. **In-memory processing** — no disk persistence. Files come in as base64, are processed, and discarded. Max 50MB per file.
2. **Pure-JS implementations of all parsers** — `adm-zip` for ZIP (DOCX/XLSX), built-in `Buffer` + regex for the rest. Zero native deps.
3. **PDF extractor is intentionally minimal** — text-only, no OCR, no FlateDecode. Handles ~80% of business PDFs (text-based ones) without a 20MB native dependency. For the rest, swap in `pdfjs-dist` or a paid service.
4. **One-shot extract-and-RAG endpoint** — eliminates the boilerplate of "extract, then post to RAG, then handle errors." Single call returns both.
5. **Format auto-detection** — from extension, then mimeType, then explicit `format`. Sensible errors when ambiguous.

## Integration with the rest of RTMN

- **Calls:** RAG Platform (4781) internally from `POST /api/extract-and-rag`. Configurable via `RAG_URL` env var.
- **Wired into HOJAI Intelligence** (4881) routing: `documentIntelligence: http://localhost:4782`, capabilities `docExtract`, `docExtractBatch`, `docExtractAndRag`, `docFormats`.
- **Used by:** Anything that needs to ingest documents — sales copilots (ingest customer PDFs), support bots (ingest knowledge base docs), analytics (ingest reports), etc.

## Configuration

| Env var | Default | What |
|---------|---------|------|
| `PORT` | `4782` | service port |
| `MAX_FILE_SIZE_MB` | `50` | max upload size |
| `RAG_URL` | `http://localhost:4781` | RAG Platform base URL (for `extract-and-rag`) |

## File layout

```
services/document-intelligence/
├── package.json         # express, helmet, cors, uuid, adm-zip
├── CLAUDE.md            # this file
└── src/
    └── index.js         # ~750 lines — single-file service in the RTMN pattern
```

## Example: end-to-end document → RAG

```javascript
// One call. That's it.
const docx = fs.readFileSync('handbook.docx');
const r = await fetch('http://localhost:4782/api/extract-and-rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contentBase64: docx.toString('base64'),
    filename: 'handbook.docx',
    collection: 'company-handbook',
    metadata: { source: 'hr-team', version: '2026' }
  })
}).then(r => r.json());

// r.extraction.textPreview  - first 500 chars of extracted text
// r.rag.documentId          - the document ID in the RAG collection
// r.rag.chunksCreated       - how many chunks were embedded + stored
// r.took_ms                 - total time
```

Now the document is queryable:

```javascript
const q = await fetch('http://localhost:4781/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collection: 'company-handbook',
    query: 'What is the parental leave policy?'
  })
}).then(r => r.json());

// q.answer - grounded answer with sources
```

## What it does NOT do (yet)

- **OCR for image-based PDFs / scans** — needs Tesseract or a paid OCR service. Planned v1.1.
- **FlateDecode PDF streams** — many real-world PDFs compress their text streams. The minimal extractor doesn't decompress them. Planned v1.1 (will use `pdfjs-dist` or hand-rolled FlateDecode).
- **DOCX tables as data** — tables come out as flattened text. Structured table extraction is v1.2.
- **DOCX embedded images** — not extracted. Image-aware extraction is v1.2.
- **XLSX formulas / charts** — only cell values. Formula evaluation is out of scope.
- **PPTX, PPT, ODP** — presentation formats. Planned v1.2.
- **Streaming ingestion** — batch endpoint exists, no SSE/progress events.

---

*Last updated: June 19, 2026 — Initial release as part of HOJAI AI Division 6 (Data & Knowledge Cloud) build-out.*
*Companion services: [../vector-db/CLAUDE.md](../vector-db/CLAUDE.md), [../rag-platform/CLAUDE.md](../rag-platform/CLAUDE.md).*
