import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// New sections to add to CLAUDE.md
const AUTH_SECTION = `

---

## Authentication & Database

### Authentication System
- **Register:** \`POST /auth/register\` - Create new business/account
- **Login:** \`POST /auth/login\` - Authenticate and get token
- **Verify:** \`GET /auth/verify\` - Validate JWT token
- **requireAuth middleware** - Protects API endpoints

### Database
- **MongoDB Support** - Full persistence via MONGODB_URI
- **Demo Mode** - Runs in-memory without MongoDB
- **Multi-tenancy** - All data isolated by tenantId/businessId

### CRM Integration
- **REZ CRM Hub** - Customer sync on registration
- **Contact Management** - Unified customer records
- **Industry Tagging** - Automatic industry classification

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Service port | No (default: service default) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

### API Authentication Flow
\`\`\`bash
# 1. Register a new business
curl -X POST http://localhost:5010/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"businessId":"biz_123","email":"owner@restaurant.com","password":"secret","businessName":"My Restaurant"}'

# 2. Login to get token
curl -X POST http://localhost:5010/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"owner@restaurant.com","password":"secret"}'

# 3. Use token in requests
curl -H "Authorization: Bearer <token>" http://localhost:5010/api/menu
\`\`\`
`;

// Services to update
const services = [
  // Industry OS
  { dir: 'restaurant-os', name: 'Restaurant OS', port: 5010, industry: 'restaurant' },
  { dir: 'hotel-os', name: 'Hotel OS', port: 5025, industry: 'hotel' },
  { dir: 'healthcare-os', name: 'Healthcare OS', port: 5020, industry: 'healthcare' },
  { dir: 'retail-os', name: 'Retail OS', port: 5030, industry: 'retail' },
  { dir: 'legal-os', name: 'Legal OS', port: 5035, industry: 'legal' },
  { dir: 'hospitality-os', name: 'Hospitality OS', port: 5050, industry: 'hospitality' },
  { dir: 'education-os', name: 'Education OS', port: 5060, industry: 'education' },
  { dir: 'automotive-os', name: 'Automotive OS', port: 5080, industry: 'automotive' },
  { dir: 'beauty-os', name: 'Beauty OS', port: 5090, industry: 'beauty' },
  { dir: 'fitness-os', name: 'Fitness OS', port: 5110, industry: 'fitness' },
  { dir: 'manufacturing-os', name: 'Manufacturing OS', port: 5150, industry: 'manufacturing' },
  { dir: 'realestate-os', name: 'RealEstate OS', port: 5230, industry: 'realestate' },
  // Foundation
  { dir: 'corpid-service', name: 'CorpID', port: 4702, industry: 'foundation' },
  { dir: 'memory-os', name: 'MemoryOS', port: 4703, industry: 'foundation' },
  { dir: 'goal-os', name: 'GoalOS', port: 4242, industry: 'foundation' },
  { dir: 'decision-engine', name: 'Decision Engine', port: 4240, industry: 'foundation' },
  { dir: 'agent-economy', name: 'Agent Economy', port: 4251, industry: 'foundation' },
  { dir: 'twinos-hub', name: 'TwinOS Hub', port: 4705, industry: 'foundation' },
  // Digital Twins
  { dir: 'agent-twin', name: 'Agent Twin', port: 3011, industry: 'twin' },
  { dir: 'area-twin', name: 'Area Twin', port: 3012, industry: 'twin' },
  { dir: 'buyer-twin', name: 'Buyer Twin', port: 3013, industry: 'twin' },
  { dir: 'deal-twin', name: 'Deal Twin', port: 3014, industry: 'twin' },
  { dir: 'property-twin', name: 'Property Twin', port: 3015, industry: 'twin' },
  { dir: 'referral-twin', name: 'Referral Twin', port: 3016, industry: 'twin' },
];

console.log('==========================================');
console.log('Updating CLAUDE.md with Auth + DB + CRM');
console.log('==========================================');

for (const svc of services) {
  const claudePath = join(rootDir, svc.dir, 'CLAUDE.md');
  
  if (!existsSync(claudePath)) {
    console.log('⏭️  No CLAUDE.md: ' + svc.name);
    continue;
  }
  
  try {
    let content = readFileSync(claudePath, 'utf8');
    
    // Skip if already has auth section
    if (content.includes('Authentication & Database')) {
      console.log('⏭️  Already updated: ' + svc.name);
      continue;
    }
    
    // Add Auth section before ---
    const insertPos = content.indexOf('---');
    if (insertPos !== -1) {
      content = content.slice(0, insertPos) + AUTH_SECTION + content.slice(insertPos);
    }
    
    // Update Port section if exists
    content = content.replace(
      /\*\*Port:\*\* \d+/,
      '**Port:** ' + svc.port
    );
    
    writeFileSync(claudePath, content);
    console.log('✓ Updated: ' + svc.name + ' (port ' + svc.port + ')');
  } catch (err) {
    console.log('✗ Error: ' + svc.name + ' - ' + err.message);
  }
}

console.log('\nDone!');
