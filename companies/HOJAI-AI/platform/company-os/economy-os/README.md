# EconomyOS

Wallets, Trust, Transactions.

## Wallets

| Type | Limit | Purpose |
|------|--------|---------|
| Corporate | ₹1Cr/day | Company funds |
| User | ₹50k/day | Employees, customers |
| Agent | ₹1L/day | AI workers |

## Usage

```typescript
import { walletService } from '@hojai/economy-os';

const wallet = walletService.createCorporateWallet(companyId);
walletService.credit(wallet.id, 100000, 'Funding');
```
