/**
 * @hojai/create — template renderer.
 *
 * Walks a starter template directory and copies every file into a
 * target directory, replacing `{{TOKEN}}` placeholders with values
 * from the options object. Files starting with `_` are renamed
 * (e.g. `_gitignore` → `.gitignore`).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const TOKEN_RE = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

function replaceTokens(content, vars) {
  return content.replace(TOKEN_RE, (_, name) => (name in vars ? String(vars[name]) : `{{${name}}}`));
}

function shouldSkip(relPath) {
  const base = path.basename(relPath);
  return base === 'node_modules' || base === 'dist' || base === '.DS_Store';
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (shouldSkip(full)) continue;
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function renderName(filename) {
  if (filename.startsWith('_') && !filename.startsWith('__')) {
    return '.' + filename.slice(1);
  }
  return filename;
}

export async function renderTemplate({ templateDir, targetDir, vars }) {
  const files = [];
  for await (const file of walk(templateDir)) {
    const rel = path.relative(templateDir, file);
    const rendered = rel.split(path.sep).map(renderName).join(path.sep);
    const dest = path.join(targetDir, rendered);

    await fs.mkdir(path.dirname(dest), { recursive: true });

    let content;
    if (rel.endsWith('.bin') || rel.endsWith('.png') || rel.endsWith('.ico')) {
      content = await fs.readFile(file);
      await fs.writeFile(dest, content);
    } else {
      const text = await fs.readFile(file, 'utf8');
      await fs.writeFile(dest, replaceTokens(text, vars));
    }
    files.push(rendered);
  }
  return files;
}

export function buildVars({ name, template, agents, region, languages }) {
  const projectTitle = name
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  return {
    PROJECT_NAME: name,
    PROJECT_TITLE: projectTitle,
    PROJECT_TITLE_LOWER: projectTitle.toLowerCase(),
    TEMPLATE: template,
    AGENTS_JSON: JSON.stringify(agents),
    AGENTS_COMMA: agents.join(', '),
    REGION: region,
    LANGUAGES_JSON: JSON.stringify(languages),
    LANGUAGES_COMMA: languages.join(', '),
    PRIMARY_LANGUAGE: languages[0] || 'en',
    CREATED_AT: new Date().toISOString().slice(0, 10),
    HOJAI_VERSION: '1.0.0'
  };
}
