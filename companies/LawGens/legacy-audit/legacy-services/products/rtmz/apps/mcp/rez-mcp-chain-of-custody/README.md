# REZ MCP Chain of Custody

MCP server for legal-grade evidence chain of custody tracking and integrity verification.

## Features

- **Evidence Chains**: Create immutable evidence chains
- **Custody Tracking**: Track evidence transfers between custodians
- **Integrity Verification**: SHA256 hash verification
- **Timeline Generation**: Generate custody timelines
- **Court-Ready Reports**: Export formatted reports

## Tools

| Tool | Description |
|------|-------------|
| `create_chain` | Create new evidence chain |
| `add_custodian` | Record evidence transfer |
| `verify_integrity` | Verify chain integrity |
| `generate_timeline` | Generate custody timeline |
| `export_report` | Export court-ready report |
| `list_chains` | List all chains |

## HTTP API

### Create Chain
```bash
curl -X POST http://localhost:3122/chain \
  -H "Content-Type: application/json" \
  -d '{
    "evidenceId": "EVD-001",
    "description": "Laptop seized from suspect",
    "custodian": {
      "name": "John Doe",
      "role": "Forensic Analyst",
      "organization": "Crime Lab",
      "contact": "john@example.com"
    }
  }'
```

### Transfer Custody
```bash
curl -X POST http://localhost:3122/chain/{chainId}/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "newCustodian": {
      "name": "Jane Smith",
      "role": "Evidence Officer",
      "organization": "Police Dept",
      "contact": "jane@example.com"
    },
    "notes": "Transferred for analysis"
  }'
```

### Verify Integrity
```bash
curl http://localhost:3122/chain/{chainId}/verify
```

### Export Report
```bash
curl http://localhost:3122/chain/{chainId}/export
```

## Legal Compliance

- Section 65B (India IT Act) compliant
- Chain of integrity verification
- Timestamped custody events
- Digital signatures for transfers

## Environment

```
PORT=3122
TRANSPORT=http|stdio
```

## Usage

```bash
npm install
npm run build
npm start
```