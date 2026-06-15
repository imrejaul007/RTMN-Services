// Create all 24 Industry OS services
import { mkdir, writeFile, cp, access } from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

const INDUSTRIES = [
  { name: 'restaurant', port: 5010, title: 'Restaurant OS', twins: ['menu', 'order', 'kitchen', 'table', 'customer'] },
  { name: 'hotel', port: 5025, title: 'Hotel OS', twins: ['room', 'booking', 'guest', 'service', 'revenue'] },
  { name: 'healthcare', port: 5020, title: 'Healthcare OS', twins: ['patient', 'appointment', 'doctor', 'prescription'] },
  { name: 'retail', port: 5030, title: 'Retail OS', twins: ['product', 'inventory', 'customer', 'cart', 'supplier'] },
  { name: 'legal', port: 5035, title: 'Legal OS', twins: ['client', 'case', 'lawyer', 'document'] },
  { name: 'education', port: 5060, title: 'Education OS', twins: ['course', 'student', 'instructor', 'enrollment'] },
  { name: 'agriculture', port: 5070, title: 'Agriculture OS', twins: ['farm', 'crop', 'livestock'] },
  { name: 'automotive', port: 5080, title: 'Automotive OS', twins: ['vehicle', 'customer', 'service'] },
  { name: 'beauty', port: 5090, title: 'Beauty OS', twins: ['client', 'service', 'staff', 'appointment'] },
  { name: 'fashion', port: 5095, title: 'Fashion OS', twins: ['product', 'collection'] },
  { name: 'fitness', port: 5110, title: 'Fitness OS', twins: ['member', 'trainer', 'class', 'membership'] },
  { name: 'gaming', port: 5120, title: 'Gaming OS', twins: ['game', 'player', 'tournament'] },
  { name: 'government', port: 5130, title: 'Government OS', twins: ['citizen', 'service', 'department'] },
  { name: 'home-services', port: 5140, title: 'HomeServices OS', twins: ['provider', 'customer', 'booking'] },
  { name: 'manufacturing', port: 5150, title: 'Manufacturing OS', twins: ['product', 'machine', 'production', 'quality'] },
  { name: 'non-profit', port: 5160, title: 'NonProfit OS', twins: ['donor', 'campaign', 'beneficiary'] },
  { name: 'professional', port: 5170, title: 'Professional OS', twins: ['consultant', 'client', 'project'] },
  { name: 'sports', port: 5180, title: 'Sports OS', twins: ['team', 'player', 'match'] },
  { name: 'travel', port: 5190, title: 'Travel OS', twins: ['destination', 'package'] },
  { name: 'entertainment', port: 5200, title: 'Entertainment OS', twins: ['event', 'venue', 'ticket'] },
  { name: 'construction', port: 5210, title: 'Construction OS', twins: ['project', 'contractor'] },
  { name: 'financial', port: 5220, title: 'Financial OS', twins: ['account', 'transaction'] },
  { name: 'realestate', port: 5230, title: 'RealEstate OS', twins: ['property', 'listing', 'lead', 'agent'] },
  { name: 'transport', port: 5240, title: 'Transport OS', twins: ['vehicle', 'driver', 'rider'] },
];

const BASE_SERVICE = 'restaurant-os';
const SERVICES_DIR = 'industry-os/services';

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createService(ind) {
  const serviceDir = `${SERVICES_DIR}/${ind.name}-os`;
  const baseDir = `${SERVICES_DIR}/${BASE_SERVICE}`;

  // Use existing restaurant-os as template if it exists
  const templateDir = await exists(baseDir) ? baseDir : serviceDir;

  if (await exists(serviceDir)) {
    console.log(`✓ ${ind.title} already exists`);
    return;
  }

  // Create from template
  if (await exists(templateDir)) {
    execSync(`cp -r ${templateDir} ${serviceDir}`, { stdio: 'inherit' });
  } else {
    await mkdir(`${serviceDir}/src`, { recursive: true });
  }

  // Update package.json
  const pkgPath = `${serviceDir}/package.json`;
  if (await exists(pkgPath)) {
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    pkg.name = `rtmn-${ind.name}-os`;
    pkg.version = '1.0.0';
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
  }

  // Update index.js
  const idxPath = `${serviceDir}/src/index.js`;
  if (await exists(idxPath)) {
    let content = await readFile(idxPath, 'utf-8');
    content = content
      .replace(/rtmn-restaurant-os/g, `rtmn-${ind.name}-os`)
      .replace(/port: 5010/g, `port: ${ind.port}`)
      .replace(/Restaurant OS/g, ind.title)
      .replace(/restaurant-os/g, `${ind.name}-os`);
    await writeFile(idxPath, content);
  }

  console.log(`✓ Created ${ind.title} (port ${ind.port})`);
}

async function readFile(path, enc) {
  const { readFile: rf } = await import('fs/promises');
  return rf(path, enc);
}

console.log('Creating all 24 Industry OS services...\n');
for (const ind of INDUSTRIES) {
  await createService(ind);
}
console.log('\n✅ All Industry OS services created!');
