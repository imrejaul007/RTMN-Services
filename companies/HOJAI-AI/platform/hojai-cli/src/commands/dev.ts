/**
 * HOJAI CLI - Dev Command
 * Start development server with hot reload
 */

import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

export async function devCommand(options?: { port?: string; open?: boolean }) {
  const port = options?.port || '3000';
  const shouldOpen = options?.open !== false;

  console.log(chalk.bold('\n🚀 HOJAI Dev Server\n'));

  // Check for hojai.config.json
  const configPath = path.join(process.cwd(), 'hojai.config.json');
  const hasConfig = await fs.pathExists(configPath);

  if (!hasConfig) {
    console.log(chalk.yellow('⚠️  No hojai.config.json found'));
    console.log('Run "hojai init" first to initialize a project\n');
    return;
  }

  console.log(`📁 Project: ${process.cwd()}`);
  console.log(`🔌 Port: ${port}`);
  console.log('');

  // Start dev server
  const server = spawn('npx', ['tsx', 'node_modules/.bin/vite', '--port', port], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  });

  server.on('error', (err) => {
    console.error(chalk.red('✗ Server error:'), err.message);
  });

  // Open browser
  if (shouldOpen) {
    setTimeout(() => {
      const { exec } = require('child_process');
      exec(`open http://localhost:${port}`);
    }, 2000);
  }

  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Dev server stopped'));
    server.kill();
    process.exit(0);
  });
}
