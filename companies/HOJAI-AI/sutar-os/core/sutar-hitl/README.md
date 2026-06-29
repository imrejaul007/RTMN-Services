# SUTAR HITL (Human-in-the-Loop)

## Purpose
Human approval workflows for critical AI agent decisions.

## Key Features
- Approval queue management
- Human verification
- Decision authorization
- Timeout handling

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/approvals | Create approval request |
| GET | /api/approvals/:id | Get approval status |
| POST | /api/approvals/:id/approve | Approve request |
| POST | /api/approvals/:id/reject | Reject request |

## Port
4150