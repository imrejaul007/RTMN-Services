# AI Workforce

Deploy AI workers to companies.

```typescript
import { deployer } from './src';
const result = await deployer.deploy({ workerId: 'ai-cfo', companyId: 'company_123' });
```

## Workers

| Department | Workers |
|-----------|---------|
| Finance | AI CFO, AI Accountant |
| HR | AI Recruiter, AI Payroll |
| Marketing | AI CMO, AI Content |
| Sales | AI SDR, AI Closer |
| Operations | AI Ops Manager |
| Legal | AI Legal Counsel |

## Usage

```typescript
import { getDefaultWorkersForDepartment } from './src';
const workers = getDefaultWorkersForDepartment('finance');
```
