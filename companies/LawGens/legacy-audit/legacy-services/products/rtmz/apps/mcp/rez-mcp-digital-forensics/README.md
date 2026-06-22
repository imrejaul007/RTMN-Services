# REZ MCP Digital Forensics

MCP server for digital forensics operations - disk imaging, mobile analysis, artifact extraction.

## Features

- **Case Management**: Create and manage forensic cases
- **Evidence Acquisition**: Record disk, mobile, RAM evidence
- **Artifact Extraction**: Browser history, app data, cookies
- **Mobile Forensics**: iOS and Android analysis planning
- **Timeline Analysis**: Event reconstruction
- **Findings Tracking**: Document forensic findings

## Tools

| Tool | Description |
|------|-------------|
| `create_case` | Create new forensic case |
| `acquire_image` | Record evidence acquisition |
| `analyze_mobile` | Plan mobile forensics |
| `extract_artifacts` | Extract browser/app artifacts |
| `analyze_ram` | Analyze RAM dump |
| `timeline_events` | Create event timeline |
| `add_finding` | Add finding to case |
| `list_cases` | List all cases |

## HTTP API

### Create Case
```bash
curl -X POST http://localhost:3123/case \
  -H "Content-Type: application/json" \
  -d '{"caseNumber": "CASE-001", "description": "Forensic investigation"}'
```

### Add Evidence
```bash
curl -X POST http://localhost:3123/case/{id}/evidence \
  -H "Content-Type: application/json" \
  -d '{"type": "disk", "source": "/dev/sda", "acquiredBy": "John"}'
```

### Add Finding
```bash
curl -X POST http://localhost:3123/case/{id}/finding \
  -H "Content-Type: application/json" \
  -d '{"category": "Malware", "description": "Found suspicious file", "severity": "high"}'
```

### Mobile Analysis
```bash
curl -X POST http://localhost:3123/analyze/mobile \
  -H "Content-Type: application/json" \
  -d '{"platform": "android"}'
```

## Supported Evidence Types

| Type | Tools |
|------|-------|
| Disk | FTK Imager, dd, Guymager |
| Mobile | Cellebrite, XRY, Oxygen |
| RAM | Magnet RAM Capture, DumpIt |
| Network | Wireshark, tcpdump |

## Environment

```
PORT=3123
TRANSPORT=http|stdio
```

## Usage

```bash
npm install
npm run build
npm start
```