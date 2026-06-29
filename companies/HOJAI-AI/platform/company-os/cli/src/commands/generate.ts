/**
 * Generate Extension Command
 *
 * Creates a new industry extension from a template.
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

interface GenerateOptions {
  from: string;
  output: string;
}

const TEMPLATE_DIR = path.join(import.meta.dirname, '../templates');

// Industry-specific replacements
const REPLACEMENTS: Record<string, Record<string, string>> = {
  restaurant: {
    Restaurant: 'Restaurant',
    restaurant: 'restaurant',
    menu: 'menu',
    table: 'table',
    order: 'order',
  },
  beauty: {
    Restaurant: 'Beauty',
    restaurant: 'beauty',
    menu: 'service',
    table: 'appointment',
    order: 'booking',
  },
  hotel: {
    Restaurant: 'Hotel',
    restaurant: 'hotel',
    menu: 'room',
    table: 'booking',
    order: 'reservation',
  },
  healthcare: {
    Restaurant: 'Healthcare',
    restaurant: 'healthcare',
    menu: 'service',
    table: 'appointment',
    order: 'prescription',
  },
};

export async function generateExtension(industry: string, options: GenerateOptions) {
  console.log(chalk.blue(`\n🔧 Generating ${industry} extension...\n`));

  const template = options.from || 'restaurant';
  const outputDir = options.output || `./${industry}-extension`;

  // Check if template exists
  const templateDir = path.join(TEMPLATE_DIR, template);
  if (!fs.existsSync(templateDir)) {
    console.log(chalk.red(`\n❌ Template '${template}' not found`));
    console.log(chalk.yellow(`Available templates:`));
    if (fs.existsSync(TEMPLATE_DIR)) {
      fs.readdirSync(TEMPLATE_DIR).forEach(t => {
        console.log(`  - ${t}`);
      });
    }
    process.exit(1);
  }

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  // Copy and transform template
  copyDirectory(templateDir, outputDir, industry, template);

  console.log(chalk.green(`\n✅ Extension generated successfully!`));
  console.log(chalk.bold('\nLocation:'), outputDir);
  console.log(chalk.bold('\nNext steps:'));
  console.log(`  ${chalk.cyan(`cd ${outputDir}`)}`);
  console.log(`  ${chalk.cyan('npm install')}`);
  console.log(`  ${chalk.cyan('npm start')}`);
  console.log('');
}

function copyDirectory(src: string, dest: string, industry: string, template: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  const replacements = REPLACEMENTS[industry] || REPLACEMENTS.restaurant;
  const templateReplacements = REPLACEMENTS[template] || REPLACEMENTS.restaurant;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, industry, template);
    } else {
      // Read and transform content
      let content = fs.readFileSync(srcPath, 'utf-8');

      // Apply replacements
      for (const [key, value] of Object.entries(templateReplacements)) {
        content = content.replace(new RegExp(key, 'gi'), replacements[key] || value);
      }

      fs.writeFileSync(destPath, content);
    }
  }
}
