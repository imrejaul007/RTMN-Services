import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DEFAULT_CONFIG, type HojaiConfig } from './foundation-config.js';

export interface CliConfig {
  apiKey?: string;
  baseUrl: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.hojai');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function readFileConfig(): Partial<CliConfig> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return {};
}

function readEnv(): Partial<CliConfig> {
  return {
    apiKey: process.env.HOJAI_API_KEY,
    baseUrl: process.env.HOJAI_BASE_URL
  };
}

export function loadConfig(flags: Partial<CliConfig> = {}): HojaiConfig {
  const file = readFileConfig();
  const env = readEnv();
  const merged: CliConfig = {
    apiKey: flags.apiKey ?? env.apiKey ?? file.apiKey,
    baseUrl: flags.baseUrl ?? env.baseUrl ?? file.baseUrl ?? DEFAULT_CONFIG.baseUrl
  };
  return { ...DEFAULT_CONFIG, ...merged };
}

export function saveConfig(config: CliConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function configFilePath(): string { return CONFIG_FILE; }
