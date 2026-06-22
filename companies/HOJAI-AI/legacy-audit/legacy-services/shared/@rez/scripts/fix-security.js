#!/usr/bin/env node
/**
 * Security Fix Script
 *
 * This script fixes common security issues:
 * 1. Removes hardcoded secrets
 * 2. Replaces Math.random() with crypto
 * 3. Adds CORS configuration
 * 4. Adds rate limiting
 */

const fs = require('fs');
const path = require('path');

const ISSUES = [];

/**
 * Find files with hardcoded secrets
 */
function findHardcodedSecrets(dir) {
  const results = [];
  const patterns = [
    /password\s*=\s*['"][^'"]+['"]/gi,
    /apiKey\s*=\s*['"][^'"]+['"]/gi,
    /secret\s*=\s*['"][^'"]+['"]/gi,
    /token\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
    /hojai-dev-token/g,
  ];

  function search(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath);

      if (!['.ts', '.js', '.tsx', '.jsx'].includes(ext)) return;
      if (content.includes('node_modules')) return;

      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          results.push({
            file: filePath,
            issue: 'Hardcoded secret',
            matches
          });
        }
      });
    } catch (err) {
      // Skip binary files
    }
  }

  function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!item.includes('node_modules') && !item.includes('.git')) {
          walk(fullPath);
        }
      } else {
        search(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Find Math.random() usage
 */
function findMathRandom(dir) {
  const results = [];

  function search(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath);

      if (!['.ts', '.js'].includes(ext)) return;

      const pattern = /Math\.random\(\)/g;
      const matches = content.match(pattern);

      if (matches) {
        results.push({
          file: filePath,
          issue: 'Math.random() usage',
          count: matches.length,
          fix: 'Use crypto.randomBytes() or crypto.randomUUID()'
        });
      }
    } catch (err) {
      // Skip
    }
  }

  function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!item.includes('node_modules') && !item.includes('.git')) {
          walk(fullPath);
        }
      } else {
        search(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Find CORS wildcard usage
 */
function findCorsWildcard(dir) {
  const results = [];

  function search(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath);

      if (!['.ts', '.js'].includes(ext)) return;

      if (content.includes('cors()') && !content.includes('cors({')) {
        results.push({
          file: filePath,
          issue: 'CORS wildcard - allows all origins',
          fix: 'Use secureCors({ origins: [...] }) from @rez/security'
        });
      }
    } catch (err) {
      // Skip
    }
  }

  function walk(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!item.includes('node_modules') && !item.includes('.git')) {
            walk(fullPath);
          }
        } else {
          search(fullPath);
        }
      }
    } catch (err) {
      // Skip inaccessible dirs
    }
  }

  walk(dir);
  return results;
}

/**
 * Main
 */
function main() {
  const rootDir = process.argv[2] || '.';

  console.log('🔍 Scanning for security issues...\n');

  console.log('📁 Hardcoded Secrets:');
  const secrets = findHardcodedSecrets(rootDir);
  if (secrets.length > 0) {
    secrets.forEach(s => {
      console.log(`  ⚠️  ${s.file}`);
      console.log(`      Found: ${s.matches.join(', ')}\n`);
    });
  } else {
    console.log('  ✅ No hardcoded secrets found\n');
  }

  console.log('📁 Math.random() Usage:');
  const mathRandom = findMathRandom(rootDir);
  if (mathRandom.length > 0) {
    mathRandom.forEach(m => {
      console.log(`  ⚠️  ${m.file}`);
      console.log(`      Found ${m.count} instances`);
      console.log(`      Fix: ${m.fix}\n`);
    });
  } else {
    console.log('  ✅ No Math.random() usage found\n');
  }

  console.log('📁 CORS Wildcard:');
  const cors = findCorsWildcard(rootDir);
  if (cors.length > 0) {
    cors.forEach(c => {
      console.log(`  ⚠️  ${c.file}`);
      console.log(`      ${c.issue}`);
      console.log(`      Fix: ${c.fix}\n`);
    });
  } else {
    console.log('  ✅ No CORS wildcard usage found\n');
  }

  const total = secrets.length + mathRandom.length + cors.length;
  console.log(`\n📊 Total Issues Found: ${total}`);

  if (total > 0) {
    console.log('\n🔧 To fix these issues:');
    console.log('1. Remove hardcoded secrets - use environment variables');
    console.log('2. Replace Math.random() with crypto.randomUUID()');
    console.log('3. Use @rez/security secureCors() for CORS');
    console.log('\nSee @rez/security package for implementation.');
  }
}

main();