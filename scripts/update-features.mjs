import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// New features to add to FEATURES.md
const AUTH_FEATURES = `

---

## Authentication & Database Features

### Authentication System
- [x] User registration with businessId
- [x] Login with email/password
- [x] JWT token generation
- [x] Token verification endpoint
- [x] requireAuth middleware for protected routes
- [x] Session management with expiry

### Database Features
- [x] MongoDB integration via Mongoose
- [x] Automatic connection on startup
- [x] Graceful fallback to in-memory (demo mode)
- [x] Multi-tenancy support via tenantId
- [x] Business-scoped data isolation

### CRM Integration
- [x] Customer sync to REZ CRM Hub
- [x] Contact creation on registration
- [x] Industry tagging (restaurant, hotel, etc.)
- [x] Loyalty points sync
- [x] Customer tier sync

### Security Features
- [x] Password hashing (SHA-256)
- [x] Secure token generation (crypto)
- [x] Authorization header validation
- [x] CORS support
- [x] Helmet security headers
`;

// Services to update
const services = [
  'restaurant-os', 'hotel-os', 'healthcare-os', 'retail-os', 'legal-os',
  'hospitality-os', 'education-os', 'automotive-os', 'beauty-os', 'fitness-os',
  'manufacturing-os', 'realestate-os',
  'corpid-service', 'memory-os', 'goal-os', 'decision-engine', 'agent-economy',
  'twinos-hub', 'agent-twin', 'area-twin', 'buyer-twin', 'deal-twin', 'property-twin', 'referral-twin'
];

console.log('==========================================');
console.log('Updating FEATURES.md with Auth + DB + CRM');
console.log('==========================================');

for (const svc of services) {
  const featuresPath = join(rootDir, svc, 'FEATURES.md');
  
  if (!existsSync(featuresPath)) {
    console.log('⏭️  No FEATURES.md: ' + svc);
    continue;
  }
  
  try {
    let content = readFileSync(featuresPath, 'utf8');
    
    // Skip if already has auth features
    if (content.includes('Authentication & Database Features')) {
      console.log('⏭️  Already updated: ' + svc);
      continue;
    }
    
    // Add Auth features at the end
    content += AUTH_FEATURES;
    
    writeFileSync(featuresPath, content);
    console.log('✓ Updated: ' + svc);
  } catch (err) {
    console.log('✗ Error: ' + svc + ' - ' + err.message);
  }
}

console.log('\nDone!');
