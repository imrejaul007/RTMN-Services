/**
 * Template Renderer — Reusable token replacement engine for company templates
 * Based on foundry/packages/create-hojai/src/render.js
 */

import { readFile, readdir, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';

/**
 * Available tokens for replacement
 */
export const TOKENS = [
  'PROJECT_NAME',
  'PROJECT_TITLE',
  'TEMPLATE',
  'REGION',
  'LANGUAGES_COMMA',
  'LANGUAGES_JSON',
  'AGENTS_COMMA',
  'AGENTS_JSON',
  'PRIMARY_LANGUAGE',
  'CREATED_AT',
  'HOJAI_VERSION'
];

/**
 * Token pattern: {{TOKEN_NAME}}
 */
const TOKEN_REGEX = /\{\{([A-Z_]+)\}\}/g;

/**
 * File rename pattern: _foo → .foo
 */
const RENAME_PREFIX = '_';

/**
 * Replace all {{TOKEN}} occurrences in text
 */
export function replaceTokens(text, vars) {
  return text.replace(TOKEN_REGEX, (match, tokenName) => {
    if (vars.hasOwnProperty(tokenName)) {
      return vars[tokenName];
    }
    // Leave unknown tokens intact
    return match;
  });
}

/**
 * Determine if a file should be renamed (prefixed with _)
 */
function shouldRename(filename) {
  return filename.startsWith(RENAME_PREFIX) && !filename.startsWith('__');
}

/**
 * Get the output filename (strip _ prefix if needed)
 */
function getOutputFilename(filename) {
  if (shouldRename(filename)) {
    return '.' + filename.slice(1);
  }
  return filename;
}

/**
 * Check if file is binary based on extension
 */
function isBinaryFile(filename) {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.woff', '.woff2', '.ttf', '.eot',
    '.mp3', '.mp4', '.wav', '.webm', '.avi', '.mov',
    '.exe', '.dll', '.so', '.dylib'
  ];
  const ext = extname(filename).toLowerCase();
  return binaryExtensions.includes(ext);
}

/**
 * Render a single template file
 */
async function renderFile(templatePath, outputPath, vars) {
  const filename = basename(templatePath);

  // Skip non-renderable files
  if (filename === 'package-lock.json' || filename === '.git') {
    return null;
  }

  // Binary files: copy as-is
  if (isBinaryFile(filename)) {
    const content = await readFile(templatePath);
    return { path: outputPath, content, binary: true };
  }

  // Text files: token replacement
  let content = await readFile(templatePath, 'utf-8');
  const rendered = replaceTokens(content, vars);

  return { path: outputPath, content: rendered, binary: false };
}

/**
 * Recursively walk a directory and render all files
 */
async function walkDirectory(templateDir, vars, relativePath = '') {
  const entries = await readdir(join(templateDir, relativePath), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(templateDir, relativePath, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const outputName = getOutputFilename(entry.name);
    const outputPath = relativePath ? `${relativePath}/${outputName}` : outputName;

    if (entry.isDirectory()) {
      // Recurse into subdirectory
      const subFiles = await walkDirectory(templateDir, vars, relPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const result = await renderFile(fullPath, outputPath, vars);
      if (result) {
        files.push(result);
      }
    }
  }

  return files;
}

/**
 * Main render function — renders a template directory to a file map
 * @param {string} templateDir - Path to the template directory
 * @param {object} vars - Token values
 * @returns {Promise<object>} - Map of { 'path': 'content' }
 */
export async function renderTemplate(templateDir, vars) {
  if (!existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  const files = await walkDirectory(templateDir, vars);

  // Convert to path → content map
  const fileMap = {};
  for (const file of files) {
    if (file.binary) {
      // Binary files stored as base64
      fileMap[file.path] = file.content.toString('base64');
    } else {
      fileMap[file.path] = file.content;
    }
  }

  return fileMap;
}

/**
 * Build render vars from blueprint config
 */
export function buildRenderVars(blueprint) {
  const config = blueprint.config;

  // Get primary region
  const primaryRegion = config.regions?.[0] || 'us-east';

  // Get primary language
  const primaryLanguage = config.languages?.[0] || 'en';

  // Build agents list
  const agentNames = blueprint.agents?.map(a => a.name || a.key) || [];

  // Language display names
  const languageNames = {
    en: 'English', hi: 'Hindi', ar: 'Arabic', es: 'Spanish',
    fr: 'French', de: 'German', pt: 'Portuguese', ja: 'Japanese', zh: 'Chinese'
  };

  return {
    PROJECT_NAME: config.slug || slugify(config.name),
    PROJECT_TITLE: config.name,
    TEMPLATE: config.type || 'company',
    REGION: primaryRegion,
    LANGUAGES_COMMA: (config.languages || ['en']).map(l => languageNames[l] || l).join(', '),
    LANGUAGES_JSON: JSON.stringify(config.languages || ['en']),
    AGENTS_COMMA: agentNames.join(', '),
    AGENTS_JSON: JSON.stringify(agentNames),
    PRIMARY_LANGUAGE: primaryLanguage,
    CREATED_AT: new Date().toISOString().split('T')[0],
    HOJAI_VERSION: '1.0.0'
  };
}

/**
 * Slugify a string
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}
