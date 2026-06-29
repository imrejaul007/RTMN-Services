/**
 * HOJAI Config
 */

export interface HOJAIConfig {
  apiUrl: string;
  apiKey?: string;
  timeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  region?: string;
  environment?: 'development' | 'staging' | 'production';
}

export class Config implements HOJAIConfig {
  apiUrl: string;
  apiKey?: string;
  timeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  region?: string;
  environment: 'development' | 'staging' | 'production';

  constructor(config: Partial<HOJAIConfig> = {}) {
    this.apiUrl = config.apiUrl || process.env.HOJAI_API_URL || 'https://api.hojai.ai';
    this.apiKey = config.apiKey || process.env.HOJAI_API_KEY;
    this.timeout = config.timeout || 30000;
    this.logLevel = config.logLevel || 'info';
    this.region = config.region || process.env.HOJAI_REGION || 'us-east-1';
    this.environment = config.environment || (process.env.NODE_ENV as any) || 'development';
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  get isDevelopment(): boolean {
    return this.environment === 'development';
  }
}
