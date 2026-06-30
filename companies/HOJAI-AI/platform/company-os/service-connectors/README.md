# Service Connectors

Connect to REZ-Merchant services.

## Connectors

| Connector | Services |
|-----------|----------|
| Restaurant | 7 |
| Beauty | 4 |
| Hotel | 5 |
| Retail | 6 |
| Healthcare | 5 |
| Education | 5 |

## Usage

```typescript
import { getConnector } from './src';
const restaurant = getConnector('restaurant', tenant);
const menu = await restaurant.getMenu();
```
