#!/usr/bin/env node
/**
 * Script to replace console.log/error/warn with @rez/logger structured logging
 *
 * Usage:
 *   node scripts/replace-logging.js [path]
 *
 * Examples:
 *   node scripts/replace-logging.js ./hojai-ai
 *   node scripts/replace-logging.js ./RAZO-Keyboard
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const REPLACEMENTS = [
  // console.log replacements
  {
    pattern: /console\.log\(`([^`]*)`\)/g,
    replacement: (match, template) => `logger.info(\`${template}\`)`,
    type: 'template'
  },
  {
    pattern: /console\.log\('([^']*)'\)/g,
    replacement: (match, msg) => `logger.info('${msg}')`,
    type: 'single'
  },
  {
    pattern: /console\.log\("([^"]*)"\)/g,
    replacement: (match, msg) => `logger.info("${msg}")`,
    type: 'double'
  },
  // console.error replacements
  {
    pattern: /console\.error\(`([^`]*)`\)/g,
    replacement: (match, template) => `logger.error(\`${template}\`)`,
    type: 'template'
  },
  {
    pattern: /console\.error\('([^']*)'\)/g,
    replacement: (match, msg) => `logger.error('${msg}')`,
    type: 'single'
  },
  {
    pattern: /console\.error\("([^"]*)"\)/g,
    replacement: (match, msg) => `logger.error("${msg}")`,
    type: 'double'
  },
  // console.warn replacements
  {
    pattern: /console\.warn\(`([^`]*)`\)/g,
    replacement: (match, template) => `logger.warn(\`${template}\`)`,
    type: 'template'
  },
  {
    pattern: /console\.warn\('([^']*)'\)/g,
    replacement: (match, msg) => `logger.warn('${msg}')`,
    type: 'single'
  },
  {
    pattern: /console\.warn\("([^"]*)"\)/g,
    replacement: (match, msg) => `logger.warn("${msg}")`,
    type: 'double'
  },
];

// Files to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /dist/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /__tests__/,
  /mock/,
  /fixture/,
];

// Files that need import added
const NEED_IMPORT = [
  'logger'
];

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function findFiles(dir, extensions = ['.ts', '.tsx', '.js']) {
  const files = [];

  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return files;
  }

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!shouldSkip(fullPath)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext) && !shouldSkip(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

function addLoggerImport(content) {
  // Check if logger is already imported
  if (content.includes("import { createLogger") || content.includes("from '@rez/logger'") || content.includes("from './logger'") || content.includes("from \"@rez/logger\"")) {
    return { content, added: false };
  }

  // Find the last import statement
  const importRegex = /^import\s+.*from\s+['"][^'"]+['"]/gm;
  const matches = content.match(importRegex);

  if (matches && matches.length > 0) {
    const lastImport = matches[matches.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const afterLastImport = content.indexOf('\n', lastImportIndex) + 1;

    const importStatement = `\nimport { createLogger } from '@rez/logger';\n`;
    const newContent = content.slice(0, afterLastImport) + importStatement + content.slice(afterLastImport);

    return { content: newContent, added: true };
  }

  // If no imports found, add at the beginning
  const importStatement = `import { createLogger } from '@rez/logger';\n\n`;
  return { content: importStatement + content, added: true };
}

function addLoggerDeclaration(content) {
  // Check if logger is already declared
  if (content.includes('const logger = createLogger') || content.includes('let logger = createLogger')) {
    return { content, added: false };
  }

  // Find the start of the main code (after imports and type definitions)
  const lines = content.split('\n');
  let insertIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Stop at the first function or const/let declaration that isn't an import
    if ((line.startsWith('const ') || line.startsWith('let ') || line.startsWith('function ') || line.startsWith('export '))
        && !line.includes('import')) {
      insertIndex = i;
      break;
    }
  }

  const loggerDeclaration = '\n// Logger for structured logging\nconst logger = createLogger({\n  service: process.env.SERVICE_NAME || \'unknown-service\',\n  level: (process.env.LOG_LEVEL as \'debug\' | \'info\' | \'warn\' | \'error\') || \'info\',\n  pretty: process.env.NODE_ENV !== \'production\'\n});\n\n';

  const newLines = [...lines.slice(0, insertIndex), loggerDeclaration, ...lines.slice(insertIndex)];

  return { content: newLines.join('\n'), added: true };
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let modified = false;

    // Check if file has console statements
    if (!content.includes('console.log') && !content.includes('console.error') && !content.includes('console.warn')) {
      return { file: filePath, status: 'skipped' };
    }

    // Replace console statements with logger
    for (const { pattern, replacement } of REPLACEMENTS) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      // Add import if needed
      const importResult = addLoggerImport(content);
      if (importResult.added) {
        content = importResult.content;
      }

      // Add logger declaration if needed
      const declResult = addLoggerDeclaration(content);
      if (declResult.added) {
        content = declResult.content;
      }

      // Write the modified content
      fs.writeFileSync(filePath, content);

      return {
        file: filePath,
        status: 'modified',
        importsAdded: importResult.added,
        declarationAdded: declResult.added
      };
    }

    return { file: filePath, status: 'no_change' };
  } catch (error) {
    return { file: filePath, status: 'error', error: error.message };
  }
}

function main() {
  const targetPath = process.argv[2] || './';

  console.log('\n🔄 RTNM Ecosystem - Logger Replacement Script');
  console.log('='.repeat(50));
  console.log(`Target: ${targetPath}`);
  console.log('');

  const files = findFiles(targetPath);
  console.log(`Found ${files.length} files to process\n`);

  const results = {
    modified: 0,
    skipped: 0,
    no_change: 0,
    errors: 0
  };

  const modifiedFiles = [];
  const errors = [];

  for (const file of files) {
    const result = processFile(file);

    switch (result.status) {
      case 'modified':
        results.modified++;
        modifiedFiles.push(result.file);
        console.log(`✅ Modified: ${path.relative(targetPath, result.file)}`);
        if (result.importsAdded) console.log(`   └─ Added logger import`);
        if (result.declarationAdded) console.log(`   └─ Added logger declaration`);
        break;
      case 'skipped':
        results.skipped++;
        break;
      case 'no_change':
        results.no_change++;
        break;
      case 'error':
        results.errors++;
        errors.push({ file: result.file, error: result.error });
        console.log(`❌ Error: ${path.relative(targetPath, result.file)}`);
        console.log(`   └─ ${result.error}`);
        break;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  console.log(`Modified: ${results.modified}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`No changes: ${results.no_change}`);
  console.log(`Errors: ${results.errors}`);

  if (modifiedFiles.length > 0) {
    console.log('\n📝 Modified files:');
    modifiedFiles.forEach(f => console.log(`  - ${path.relative(targetPath, f)}`));
  }

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }

  console.log('\n✅ Logger replacement complete!\n');
}

main();
