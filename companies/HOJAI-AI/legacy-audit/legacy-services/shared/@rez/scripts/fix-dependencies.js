#!/usr/bin/env node
/**
 * Dependency Fix Script
 *
 * 1. Adds package-lock.json to projects without it
 * 2. Updates vulnerable packages
 * 3. Fixes uuid vulnerability (GHSA-w5hq-g745-h8pq)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Find package.json files without lock files
 */
function findPackagesWithoutLock(dir) {
  const results = [];

  function search(dir) {
    try {
      const packagePath = path.join(dir, 'package.json');

      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // Skip if not a Node.js project
        if (!pkg.dependencies && !pkg.devDependencies) {
          return;
        }

        const hasLock = fs.existsSync(path.join(dir, 'package-lock.json')) ||
                       fs.existsSync(path.join(dir, 'yarn.lock')) ||
                       fs.existsSync(path.join(dir, 'pnpm-lock.yaml'));

        if (!hasLock) {
          results.push({
            path: dir,
            name: pkg.name || path.basename(dir),
            hasLock
          });
        }
      }
    } catch (err) {
      // Skip
    }
  }

  function walk(dir) {
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;

        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          search(fullPath);
          walk(fullPath);
        }
      }
    } catch (err) {
      // Skip inaccessible
    }
  }

  walk(dir);
  return results;
}

/**
 * Add package-lock.json to a project
 */
function addLockFile(projectPath) {
  try {
    console.log(`  Adding lock file to ${path.basename(projectPath)}...`);

    // Run npm install to generate lock file
    execSync('npm install', {
      cwd: projectPath,
      stdio: 'pipe',
      timeout: 60000
    });

    return { success: true, path: projectPath };
  } catch (err) {
    return { success: false, path: projectPath, error: err.message };
  }
}

/**
 * Update uuid package
 */
function updateUuid(dir) {
  try {
    console.log(`  Updating uuid in ${path.basename(dir)}...`);

    execSync('npm update uuid', {
      cwd: dir,
      stdio: 'pipe',
      timeout: 30000
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Main
 */
function main() {
  const rootDir = process.argv[2] || '.';
  const action = process.argv[3] || 'all';

  console.log('🔧 Dependency Fix Script\n');

  if (action === 'lock' || action === 'all') {
    console.log('📁 Finding packages without lock files...\n');

    const packages = findPackagesWithoutLock(rootDir);

    if (packages.length === 0) {
      console.log('✅ All packages have lock files!\n');
    } else {
      console.log(`Found ${packages.length} packages without lock files:\n`);

      const results = packages.map(pkg => addLockFile(pkg.path));

      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`\n📊 Lock File Summary:`);
      console.log(`  Succeeded: ${succeeded}`);
      console.log(`  Failed: ${failed}`);

      if (failed > 0) {
        console.log('\n⚠️  Failed packages:');
        results.filter(r => !r.success).forEach(r => {
          console.log(`  ${r.path}: ${r.error}`);
        });
      }
    }
  }

  if (action === 'uuid' || action === 'all') {
    console.log('\n📦 Updating uuid package...\n');

    try {
      execSync('npm update uuid@^11.1.1', {
        cwd: rootDir,
        stdio: 'inherit',
        timeout: 30000
      });
      console.log('✅ uuid updated successfully');
    } catch (err) {
      console.log('⚠️  Failed to update uuid:', err.message);
    }
  }

  if (action === 'audit') {
    console.log('\n🔍 Running npm audit...\n');

    try {
      execSync('npm audit', {
        cwd: rootDir,
        stdio: 'inherit'
      });
    } catch (err) {
      console.log('Audit completed with issues');
    }
  }

  console.log('\n📝 Next steps:');
  console.log('  - Review the generated package-lock.json files');
  console.log('  - Run `npm audit` to check for remaining vulnerabilities');
  console.log('  - Commit the changes');
}

main();