#!/usr/bin/env node
/**
 * README Generator Script
 *
 * Generates standardized README.md files for services
 * that are missing documentation.
 */

const fs = require('fs');
const path = require('path');

const README_TEMPLATE = `# {SERVICE_NAME}

> {DESCRIPTION}

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 3000 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

## API Endpoints

### Health Check

\`\`\`
GET /health
\`\`\`

### Example Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |
| GET | /api/v1/{resource} | List {resources} |
| POST | /api/v1/{resource} | Create {resource} |
| GET | /api/v1/{resource}/:id | Get {resource} by ID |
| PUT | /api/v1/{resource}/:id | Update {resource} |
| DELETE | /api/v1/{resource}/:id | Delete {resource} |

## Authentication

JWT Bearer token authentication.

\`\`\`
Authorization: Bearer <token>
\`\`\`

## License

Proprietary - RTNM Digital

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
**Version:** 1.0.0`;

/**
 * Detect service type from package.json
 */
function detectServiceType(dir) {
  const packagePath = path.join(dir, 'package.json');

  try {
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Try to detect from name or description
      const name = pkg.name || '';
      const desc = pkg.description || '';

      const combined = `${name} ${desc}`.toLowerCase();

      if (combined.includes('auth') || combined.includes('login')) {
        return { type: 'auth', desc: 'Authentication service' };
      }
      if (combined.includes('api') || combined.includes('gateway')) {
        return { type: 'api', desc: 'API gateway service' };
      }
      if (combined.includes('payment') || combined.includes('wallet')) {
        return { type: 'payment', desc: 'Payment processing service' };
      }
      if (combined.includes('notification') || combined.includes('push')) {
        return { type: 'notification', desc: 'Notification service' };
      }
      if (combined.includes('ai') || combined.includes('ml') || combined.includes('intelligence')) {
        return { type: 'ai', desc: 'AI/ML intelligence service' };
      }
    }
  } catch (err) {
    // Ignore
  }

  return { type: 'generic', desc: 'Microservice' };
}

/**
 * Generate README for a service
 */
function generateReadme(servicePath, serviceName) {
  const readmePath = path.join(servicePath, 'README.md');

  // Skip if README already exists
  if (fs.existsSync(readmePath)) {
    return { skipped: true, path: readmePath };
  }

  const { desc } = detectServiceType(servicePath);

  const content = README_TEMPLATE
    .replace('{SERVICE_NAME}', serviceName)
    .replace('{DESCRIPTION}', desc)
    .replace(/\{resource\}/g, 'item')
    .replace(/\{resources\}/g, 'items');

  fs.writeFileSync(readmePath, content);

  return { created: true, path: readmePath };
}

/**
 * Find services without README
 */
function findServicesWithoutReadme(dir, depth = 0) {
  const results = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Check if this is a service directory
        const hasPackageJson = fs.existsSync(path.join(fullPath, 'package.json'));
        const hasReadme = fs.existsSync(path.join(fullPath, 'README.md'));
        const hasSrc = fs.existsSync(path.join(fullPath, 'src'));

        if (hasPackageJson && hasSrc) {
          if (!hasReadme) {
            results.push({
              path: fullPath,
              name: path.basename(fullPath)
            });
          }
        }

        // Recurse with depth limit
        if (depth < 3) {
          results.push(...findServicesWithoutReadme(fullPath, depth + 1));
        }
      }
    }
  } catch (err) {
    // Skip inaccessible directories
  }

  return results;
}

/**
 * Main
 */
function main() {
  const rootDir = process.argv[2] || '.';

  console.log('🔍 Scanning for services without README...\n');

  const services = findServicesWithoutReadme(rootDir);

  if (services.length === 0) {
    console.log('✅ All services have README files!\n');
    return;
  }

  console.log(`Found ${services.length} services without README:\n`);

  const created = [];
  const skipped = [];

  for (const service of services) {
    const result = generateReadme(service.path, service.name);
    if (result.created) {
      created.push(result.path);
      console.log(`  ✅ Created: ${service.name}`);
    } else {
      skipped.push(result.path);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Created: ${created.length} READMEs`);
  console.log(`  Skipped: ${skipped.length} (already exist)`);

  if (created.length > 0) {
    console.log('\n📝 Run `git add .` to stage the new files.');
  }
}

main();