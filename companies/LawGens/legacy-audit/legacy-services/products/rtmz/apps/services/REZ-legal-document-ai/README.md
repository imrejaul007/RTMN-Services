# REZ Legal Document AI

**Port:** 5004

AI-powered legal document analysis and clause extraction using Claude.

## Features

- **Document Analysis** - Upload and analyze legal documents
- **Clause Extraction** - Identify and extract key clauses
- **Risk Identification** - Flag risky terms and unusual clauses
- **Risk Scoring** - ML-based risk assessment (0-100)
- **Compliance Mapping** - Map clauses to compliance frameworks
- **Clause Comparison** - Compare against standard clauses
- **Document Q&A** - Ask questions about documents
- **Summary Generation** - Auto-generate document summaries

## Supported Compliance Frameworks

- GDPR (General Data Protection Regulation)
- SOC2 (Service Organization Control 2)
- ISO 27001 (Information Security)
- CCPA (California Consumer Privacy Act)
- HIPAA (Health Insurance Portability)
- PCI DSS (Payment Card Industry)

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with ANTHROPIC_API_KEY and MONGODB_URI

# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Documents

```bash
# Upload document
POST /documents/upload
Content-Type: multipart/form-data
file: <document.pdf>

# Analyze document
POST /documents/:id/analyze

# List documents
GET /documents
GET /documents?status=analyzed

# Get document details
GET /documents/:id

# Delete document
DELETE /documents/:id
```

### Clauses

```bash
# Get extracted clauses
GET /documents/:id/clauses

# Get standard clause library
GET /clauses/library

# Add to clause library
POST /clauses/library
{
  "title": "Standard Indemnification",
  "category": "indemnification",
  "content": "Each party shall indemnify...",
  "risk": "low"
}
```

### Risk Assessment

```bash
# Get risk report
GET /documents/:id/risk-report
```

### Compliance

```bash
# Check compliance
POST /documents/:id/compliance
{
  "frameworks": ["GDPR", "SOC2", "ISO27001"]
}
```

### Clause Comparison

```bash
# Compare clauses
POST /documents/:id/compare
{
  "clauseIds": ["clause_1", "clause_2"],
  "libraryClauseId": "standard_confidentiality"
}
```

### Q&A

```bash
# Ask question about document
POST /documents/:id/qa
{
  "question": "What are the termination conditions?"
}
```

### Summarize

```bash
# Generate summary
POST /documents/:id/summarize
{
  "style": "executive",
  "length": "brief"
}
```

## Example Usage

### 1. Upload Document
```bash
curl -X POST http://localhost:5004/documents/upload \
  -H "X-Tenant-ID: tenant_123" \
  -F "file=@contract.pdf"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "doc_abc123",
    "filename": "contract.pdf",
    "mimeType": "application/pdf",
    "size": 245678,
    "status": "uploaded",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Analyze Document
```bash
curl -X POST http://localhost:5004/documents/doc_abc123/analyze \
  -H "X-Tenant-ID: tenant_123"
```

Response:
```json
{
  "success": true,
  "data": {
    "documentId": "doc_abc123",
    "status": "analyzed",
    "summary": "Master Service Agreement between Company A and Service Provider B...",
    "keyParties": ["Company A", "Service Provider B"],
    "effectiveDate": "2024-01-01",
    "expirationDate": "2025-12-31",
    "riskScore": 35,
    "clauses": [
      {
        "id": "clause_1",
        "type": "confidentiality",
        "title": "Confidentiality Obligations",
        "content": "Both parties agree to maintain...",
        "risk": "low",
        "riskFactors": [],
        "recommendations": []
      },
      {
        "id": "clause_2",
        "type": "liability",
        "title": "Limitation of Liability",
        "content": "In no event shall either party...",
        "risk": "high",
        "riskFactors": [
          "Unlimited consequential damages",
          "No liability cap"
        ],
        "recommendations": [
          "Add liability cap of 12 months fees"
        ]
      }
    ],
    "complianceChecks": [
      {
        "framework": "GDPR",
        "status": "compliant",
        "issues": []
      },
      {
        "framework": "SOC2",
        "status": "partial",
        "issues": [
          "Missing data retention clause"
        ]
      }
    ]
  }
}
```

### 3. Get Risk Report
```bash
curl http://localhost:5004/documents/doc_abc123/risk-report \
  -H "X-Tenant-ID: tenant_123"
```

### 4. Ask Question
```bash
curl -X POST http://localhost:5004/documents/doc_abc123/qa \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant_123" \
  -d '{
    "question": "What happens if either party breaches the agreement?"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "question": "What happens if either party breaches the agreement?",
    "answer": "According to Section 8.2, breach of agreement triggers a 30-day cure period. If not cured, the non-breaching party may terminate immediately and seek damages as outlined in Section 12.",
    "relevantClauses": ["clause_8", "clause_12"],
    "confidence": 0.92
  }
}
```

## Document Analysis Result

```typescript
interface DocumentAnalysis {
  documentId: string;
  status: AnalysisStatus;
  
  // Summary
  summary: string;
  keyParties: string[];
  effectiveDate?: string;
  expirationDate?: string;
  
  // Clauses
  clauses: Clause[];
  
  // Risk
  riskScore: number;        // 0-100
  riskLevel: RiskLevel;     // low, medium, high, critical
  
  // Compliance
  complianceChecks: ComplianceCheck[];
  
  // Entities
  entities: {
    parties: string[];
    dates: string[];
    amounts: string[];
    jurisdictions: string[];
  };
  
  // Metadata
  confidence: number;
  analyzedAt: Date;
}

interface Clause {
  id: string;
  type: ClauseType;
  title: string;
  content: string;
  location?: string;      // Page/line reference
  risk: RiskLevel;
  riskFactors: string[];
  recommendations: string[];
}

type ClauseType = 
  | 'confidentiality'
  | 'termination'
  | 'liability'
  | 'indemnification'
  | 'intellectual_property'
  | 'data_protection'
  | 'payment'
  | 'warranty'
  | 'force_majeure'
  | 'dispute_resolution'
  | 'governing_law'
  | 'assignment'
  | 'notice'
  | 'amendment'
  | 'severability'
  | 'entire_agreement'
  | 'other';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
```

## Risk Scoring

| Score Range | Level | Description |
|-------------|-------|-------------|
| 0-25 | Low | Standard terms, low risk |
| 26-50 | Medium | Some concerning terms |
| 51-75 | High | Significant risk factors |
| 76-100 | Critical | Major red flags |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5004 |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/rez-legal-ai |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `ANTHROPIC_MODEL` | Claude model | claude-3-5-sonnet-20241022 |
| `VECTOR_STORE_URL` | Vector DB URL | - |
| `UPLOAD_DIR` | File storage directory | ./uploads |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 52428800 (50MB) |
| `NODE_ENV` | Environment | development |

## Supported File Types

- PDF (.pdf)
- Word (.doc, .docx)
- Text (.txt)
- Rich Text (.rtf)

## Authentication

Multi-tenant via headers:
```
X-Tenant-ID: tenant_123
Authorization: Bearer <token>
```

## Health Checks

```bash
curl http://localhost:5004/health
```

## License

MIT
