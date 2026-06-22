# REZ MCP Evidence Ingestion

MCP server for ingesting and processing digital evidence from various sources.

## Features

- **WhatsApp Import**: Parse WhatsApp chat exports
- **Email Import**: Process email files (PST, MBOX, EML)
- **CCTV Processing**: Extract timestamps from video files
- **Social Media Import**: Import social media data exports
- **Evidence Validation**: SHA256 hash verification
- **Metadata Extraction**: Extract file metadata

## Tools

| Tool | Description |
|------|-------------|
| `import_whatsapp` | Import WhatsApp chat export |
| `import_email` | Import email data |
| `import_cctv` | Process CCTV video |
| `import_social` | Import social media data |
| `validate_evidence` | Verify evidence hash |
| `extract_metadata` | Extract file metadata |
| `list_evidence` | List all evidence |

## HTTP API

### Upload WhatsApp Export
```bash
curl -X POST http://localhost:3120/evidence/whatsapp \
  -F "file=@chat-export.txt"
```

### Upload Email
```bash
curl -X POST http://localhost:3120/evidence/email \
  -F "file=@email.txt"
```

### Upload Generic File
```bash
curl -X POST http://localhost:3120/evidence/file \
  -F "file=@evidence.dat"
```

### Get Evidence
```bash
curl http://localhost:3120/evidence/{id}
```

### Validate Evidence
```bash
curl http://localhost:3120/evidence/{id}/validate
```

## Environment

```
PORT=3120
TRANSPORT=http|stdio
AUTH_SERVICE_URL=http://rez-auth:4002
```

## Health

```
GET /health
```

## Usage

```bash
npm install
npm run build
npm start
```