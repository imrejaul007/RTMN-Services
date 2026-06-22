/**
 * Environment configurations for all REZ services
 */

export interface ServiceUrls {
  apiUrl: string;
  walletUrl: string;
  paymentUrl: string;
  authUrl: string;
  merchantUrl: string;
  intentUrl: string;
  chatUrl: string;
  knowledgeBaseUrl: string;
}

export interface Environment {
  name: 'development' | 'staging' | 'production';
  services: ServiceUrls;
}

export const environments: Record<'development' | 'staging' | 'production', Environment> = {
  development: {
    name: 'development',
    services: {
      apiUrl: 'http://localhost:3001',
      walletUrl: 'http://localhost:4004',
      paymentUrl: 'http://localhost:4001',
      authUrl: 'http://localhost:4002',
      merchantUrl: 'http://localhost:4005',
      intentUrl: 'https://rez-intent-graph.onrender.com',
      chatUrl: 'https://REZ-support-copilot.onrender.com',
      knowledgeBaseUrl: 'https://rez-knowledge-base.onrender.com',
    },
  },
  staging: {
    name: 'staging',
    services: {
      apiUrl: 'https://staging-api.rez.money',
      walletUrl: 'https://staging-wallet.rez.money',
      paymentUrl: 'https://staging-payment.rez.money',
      authUrl: 'https://staging-auth.rez.money',
      merchantUrl: 'https://staging-merchant.rez.money',
      intentUrl: 'https://staging-intent.rez.money',
      chatUrl: 'https://staging-chat.rez.money',
      knowledgeBaseUrl: 'https://staging-knowledge.rez.money',
    },
  },
  production: {
    name: 'production',
    services: {
      apiUrl: 'https://api.rez.money',
      walletUrl: 'https://wallet.rez.money',
      paymentUrl: 'https://payment.rez.money',
      authUrl: 'https://auth.rez.money',
      merchantUrl: 'https://merchant.rez.money',
      intentUrl: 'https://rez-intent-graph.onrender.com',
      chatUrl: 'https://REZ-support-copilot.onrender.com',
      knowledgeBaseUrl: 'https://rez-knowledge-base.onrender.com',
    },
  },
};

export function getEnvironment(env: 'development' | 'staging' | 'production'): Environment {
  return environments[env] || environments.development;
}
