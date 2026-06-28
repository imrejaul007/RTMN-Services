#!/usr/bin/env node
/**
 * @hojai/inspect.js — Project inspection and diagnostics
 * Part of HOJAI Studio CLI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main inspect command - analyze a project for health, structure, and issues
 */
export async function runInspect({ args, flags }) {
  const projectDir = args[0] || process.cwd();
  const isJson = flags.json || flags['output-json'];
  const verbose = flags.verbose || flags.v;

  console.log(`\n🔍 Inspecting project: ${projectDir}\n`);

  const manifest = loadManifest(projectDir);
  const structure = analyzeStructure(projectDir);
  const health = checkHealth(projectDir, structure);
  const dependencies = analyzeDependencies(projectDir);
  const issues = findIssues(projectDir, structure, manifest);

  const report = {
    project: path.basename(projectDir),
    path: projectDir,
    manifest,
    structure,
    health,
    dependencies,
    issues,
    timestamp: new Date().toISOString()
  };

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report, verbose);
  }

  return report;
}

function loadManifest(projectDir) {
  const manifestPath = path.join(projectDir, '.hojai', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e) {
      return { error: 'Invalid manifest.json' };
    }
  }
  return { error: 'No manifest found' };
}

function analyzeStructure(projectDir) {
  const structure = {
    files: 0,
    directories: 0,
    srcFiles: 0,
    testFiles: 0,
    configFiles: [],
    sourceDirectories: [],
    largestFiles: []
  };

  function walk(dir, depth = 0) {
    if (depth > 10) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.hojai') continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        structure.directirectories++;
        walk(fullPath, depth + 1);

        if (['src', 'lib', 'app', 'components', 'services', 'agents'].includes(entry.name)) {
          structure.sourceDirectories.push(path.relative(projectDir, fullPath));
        }
      } else {
        structure.files++;

        if (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx')) {
          structure.srcFiles++;
        }

        if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
          structure.testFiles++;
        }

        if (['package.json', 'tsconfig.json', 'jest.config.js', 'vite.config.js', 'next.config.js'].includes(entry.name)) {
          structure.configFiles.push(entry.name);
        }

        // Track file sizes
        const stats = fs.statSync(fullPath);
        if (stats.size > 50000) { // > 50KB
          structure.largestFiles.push({
            name: path.relative(projectDir, fullPath),
            size: formatBytes(stats.size)
          });
        }
      }
    }
  }

  try {
    walk(projectDir);
  } catch (e) {
    // Ignore permission errors
  }

  // Sort largest files
  structure.largestFiles.sort((a, b) => {
    const aSize = parseInt(a.size);
    const bSize = parseInt(b.size);
    return bSize - aSize;
  });
  structure.largestFiles = structure.largestFiles.slice(0, 5);

  return structure;
}

function checkHealth(projectDir, structure) {
  const health = {
    score: 0,
    status: 'unknown',
    checks: []
  };

  // Check manifest
  const manifestPath = path.join(projectDir, '.hojai', 'manifest.json');
  const hasManifest = fs.existsSync(manifestPath);
  health.checks.push({
    name: 'Manifest',
    passed: hasManifest,
    message: hasManifest ? 'manifest.json found' : 'No manifest.json'
  });

  // Check package.json
  const hasPackageJson = fs.existsSync(path.join(projectDir, 'package.json'));
  health.checks.push({
    name: 'Package.json',
    passed: hasPackageJson,
    message: hasPackageJson ? 'package.json found' : 'No package.json'
  });

  // Check for tests
  const hasTests = structure.testFiles > 0;
  health.checks.push({
    name: 'Tests',
    passed: hasTests,
    message: hasTests ? `${structure.testFiles} test files found` : 'No test files found'
  });

  // Check for README
  const hasReadme = fs.existsSync(path.join(projectDir, 'README.md'));
  health.checks.push({
    name: 'Documentation',
    passed: hasReadme,
    message: hasReadme ? 'README.md found' : 'No README.md'
  });

  // Check .gitignore
  const hasGitignore = fs.existsSync(path.join(projectDir, '.gitignore'));
  health.checks.push({
    name: 'Gitignore',
    passed: hasGitignore,
    message: hasGitignore ? '.gitignore found' : 'No .gitignore'
  });

  // Check node_modules
  const hasNodeModules = fs.existsSync(path.join(projectDir, 'node_modules'));
  health.checks.push({
    name: 'Dependencies',
    passed: hasNodeModules,
    message: hasNodeModules ? 'Dependencies installed' : 'node_modules not found (run npm install)'
  });

  // Calculate score
  const passedCount = health.checks.filter(c => c.passed).length;
  health.score = Math.round((passedCount / health.checks.length) * 100);
  health.status = health.score >= 80 ? 'healthy' : health.score >= 50 ? 'warning' : 'critical';

  return health;
}

function analyzeDependencies(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { error: 'No package.json found' };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    const deps = {
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
      hojaiDeps: [],
      outdated: []
    };

    // Find HOJAI dependencies
    const allDeps = [...deps.dependencies, ...deps.devDependencies];
    deps.hojaiDeps = allDeps.filter(d => d.startsWith('@hojai/') || d.startsWith('@rtmn/'));

    // Check for common outdated patterns
    if (deps.dependencies.length === 0) {
      deps.outdated.push('No production dependencies defined');
    }
    if (deps.devDependencies.length === 0) {
      deps.outdated.push('No dev dependencies defined');
    }

    return deps;
  } catch (e) {
    return { error: 'Failed to parse package.json' };
  }
}

function findIssues(projectDir, structure, manifest) {
  const issues = [];

  // Large files
  if (structure.largestFiles.length > 0) {
    issues.push({
      severity: 'warning',
      type: 'large-files',
      message: 'Large files detected (>50KB)',
      details: structure.largestFiles
    });
  }

  // No tests
  if (structure.testFiles === 0) {
    issues.push({
      severity: 'info',
      type: 'no-tests',
      message: 'No test files found',
      suggestion: 'Add tests to ensure code quality'
    });
  }

  // No HOJAI deps
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
      const hojaiDeps = allDeps.filter(d => d.startsWith('@hojai/') || d.startsWith('@rtmn/'));

      if (hojaiDeps.length === 0) {
        issues.push({
          severity: 'info',
          type: 'no-hojai-deps',
          message: 'No HOJAI SDK dependencies found',
          suggestion: 'Consider adding @hojai/core or @hojai/memory'
        });
      }
    } catch (e) {}
  }

  // Check for .env
  const hasEnv = fs.existsSync(path.join(projectDir, '.env'));
  const hasEnvExample = fs.existsSync(path.join(projectDir, '.env.example'));

  if (hasEnv && !hasEnvExample) {
    issues.push({
      severity: 'warning',
      type: 'no-env-example',
      message: '.env exists but no .env.example',
      suggestion: 'Create .env.example for team collaboration'
    });
  }

  return issues;
}

function printReport(report, verbose) {
  // Health score
  const scoreEmoji = report.health.score >= 80 ? '✅' : report.health.score >= 50 ? '⚠️' : '❌';
  console.log(`${scoreEmoji} Health Score: ${report.health.score}% (${report.health.status})`);

  // Checks
  console.log('\n📋 Health Checks:');
  for (const check of report.health.checks) {
    const icon = check.passed ? '✅' : '❌';
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  }

  // Structure
  console.log('\n📁 Project Structure:');
  console.log(`  • ${report.structure.files} files`);
  console.log(`  • ${report.structure.srcFiles} source files`);
  console.log(`  • ${report.structure.testFiles} test files`);
  console.log(`  • ${report.structure.configFiles.length} config files`);

  if (report.structure.sourceDirectories.length > 0) {
    console.log('  • Source directories:');
    for (const dir of report.structure.sourceDirectories) {
      console.log(`    - ${dir}`);
    }
  }

  // Dependencies
  console.log('\n📦 Dependencies:');
  console.log(`  • ${report.dependencies.dependencies?.length || 0} production dependencies`);
  console.log(`  • ${report.dependencies.devDependencies?.length || 0} dev dependencies`);

  if (report.dependencies.hojaiDeps?.length > 0) {
    console.log('  • HOJAI SDKs:');
    for (const dep of report.dependencies.hojaiDeps) {
      console.log(`    - ${dep}`);
    }
  }

  // Issues
  if (report.issues.length > 0) {
    console.log('\n⚠️  Issues Found:');
    for (const issue of report.issues) {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : '💡';
      console.log(`  ${icon} [${issue.severity}] ${issue.message}`);
      if (issue.suggestion) {
        console.log(`     → ${issue.suggestion}`);
      }
    }
  } else {
    console.log('\n✅ No issues found');
  }

  // Manifest info
  if (!report.manifest.error) {
    console.log('\n📝 Manifest:');
    console.log(`  • Project ID: ${report.manifest.projectId || 'N/A'}`);
    console.log(`  • Template: ${report.manifest.template || 'N/A'}`);
    console.log(`  • Region: ${report.manifest.region || 'N/A'}`);
  }

  console.log('\n');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default runInspect;