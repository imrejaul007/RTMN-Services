# REZ MCP Expert Reports

Generate court-ready expert witness reports.

## Tools
- `generate_findings` - Create findings summary
- `generate_timeline` - Event timeline
- `generate_exhibit_list` - Exhibit list
- `export_pdf` - PDF export
- `add_declaration` - Expert declaration

## HTTP API
```bash
POST /findings - Create report
POST /report/{id}/exhibit - Add exhibit
POST /report/{id}/timeline - Add timeline
POST /report/{id}/declaration - Add declaration
GET /report/{id}/export - Export report
```

Port: 3133