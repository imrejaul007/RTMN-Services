#!/usr/bin/env node
/**
 * RTMN Industry OS - Integration Patch Script
 *
 * This script adds RTMN integration to ALL 24 Industry OS
 * by copying the shared integration module and updating the main index.js
 */

const fs = require('fs');
const path = require('path');

const INDUSTRY_OS_LIST = [
  { name: 'restaurant', port: 5010, module: 'restaurant-os' },
  { name: 'hotel', port: 5025, module: 'hotel-os' },
  { name: 'healthcare', port: 5020, module: 'healthcare-os' },
  { name: 'retail', port: 5030, module: 'retail-os' },
  { name: 'legal', port: 5035, module: 'legal-os' },
  { name: 'education', port: 5060, module: 'education-os' },
  { name: 'agriculture', port: 5070, module: 'agriculture-os' },
  { name: 'automotive', port: 5080, module: 'automotive-os' },
  { name: 'beauty', port: 5090, module: 'beauty-os' },
  { name: 'fashion', port: 5095, module: 'fashion-os' },
  { name: 'fitness', port: 5110, module: 'fitness-os' },
  { name: 'gaming', port: 5120, module: 'gaming-os' },
  { name: 'government', port: 5130, module: 'government-os' },
  { name: 'homeServices', port: 5140, module: 'home-services-os' },
  { name: 'manufacturing', port: 5150, module: 'manufacturing-os' },
  { name: 'nonProfit', port: 5160, module: 'non-profit-os' },
  { name: 'professional', port: 5170, module: 'professional-os' },
  { name: 'sports', port: 5180, module: 'sports-os' },
  { name: 'travel', port: 5190, module: 'travel-os' },
  { name: 'entertainment', port: 5200, module: 'entertainment-os' },
  { name: 'construction', port: 5210, module: 'construction-os' },
  { name: 'financial', port: 5220, module: 'financial-os' },
  { name: 'realEstate', port: 5230, module: 'realestate-os' },
  { name: 'transport', port: 5240, module: 'transport-os' },
];

const SHARED_DIR = path.join(__dirname);
const BASE_DIR = path.join(__dirname, '..');

function patchIndustryOS(industry) {
  const osDir = path.join(BASE_DIR, industry.module);
  const srcDir = path.join(osDir, 'src');
  const indexPath = path.join(srcDir, 'index.js');
  const sharedDest = path.join(srcDir, 'shared');

  console.log(`\n📦 Patching ${industry.name}-os (port ${industry.port})...`);

  // 1. Copy shared module
  const sharedSource = path.join(SHARED_DIR, 'industry-integration.js');
  const sharedDestFile = path.join(srcDir, 'industry-integration.js');

  if (!fs.existsSync(srcDir)) {
    console.log(`  ❌ src directory not found: ${srcDir}`);
    return false;
  }

  fs.copyFileSync(sharedSource, sharedDestFile);
  console.log(`  ✅ Copied industry-integration.js`);

  // 2. Read index.js
  let indexContent;
  try {
    indexContent = fs.readFileSync(indexPath, 'utf8');
  } catch (err) {
    console.log(`  ❌ Could not read index.js: ${err.message}`);
    return false;
  }

  // 3. Add require statement if not already present
  if (!indexContent.includes("require('./industry-integration')")) {
    // Find the right place to add require (after other requires)
    const requireMatch = indexContent.match(/(const \w+ = require\([^)]+\);[\r\n]+)/);
    if (requireMatch) {
      const requireInsert = `const industryIntegration = require('./industry-integration');\n`;
      indexContent = indexContent.replace(requireMatch[1], requireMatch[1] + requireInsert);
      console.log(`  ✅ Added integration require statement`);
    }
  } else {
    console.log(`  ℹ️  Integration already required`);
  }

  // 4. Add route registration if not already present
  if (!indexContent.includes('industryIntegration.registerRoutes')) {
    // Find app.listen and add before it
    const listenMatch = indexContent.match(/(app\.listen\([^)]+\)[^}]+})/);
    if (listenMatch) {
      const registerCall = `\n// Register RTMN Industry Integration\nindustryIntegration.registerRoutes(app, '${industry.name}', PORT);\n`;
      indexContent = indexContent.replace(listenMatch[1], registerCall + listenMatch[1]);
      console.log(`  ✅ Added integration route registration`);
    }
  } else {
    console.log(`  ℹ️  Routes already registered`);
  }

  // 5. Write updated index.js
  fs.writeFileSync(indexPath, indexContent);
  console.log(`  ✅ Updated index.js`);

  return true;
}

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     RTMN Industry OS - Integration Patch Script            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nFound ${INDUSTRY_OS_LIST.length} Industry OS to patch\n`);

  let successCount = 0;
  let failCount = 0;

  for (const industry of INDUSTRY_OS_LIST) {
    const result = patchIndustryOS(industry);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      PATCH SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Successfully patched: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Restart each Industry OS: cd <service-dir> && npm start`);
  console.log(`  2. Test integration: curl http://localhost:<port>/api/integration/health`);
  console.log(`  3. Or run: npm run patch && npm start`);
}

main();
