/**
 * HOJAI Agent Wallet Adapter
 */

export interface HOJAIWalletAdapter {
  walletType: 'hojai_agent';
  getBalance(agentId: string): Promise<number>;
  credit(agentId: string, amount: number): Promise<boolean>;
  debit(agentId: string, amount: number): Promise<boolean>;
}

export async function createHOJAIWalletAdapter(config?: { baseUrl?: string }): Promise<HOJAIWalletAdapter> {
  const baseUrl = config?.baseUrl || 'http://localhost:4891';

  return {
    walletType: 'hojai_agent',

    async getBalance(agentId: string): Promise<number> {
      try {
        const response = await fetch(`${baseUrl}/api/agent/${agentId}/wallet/balance`);
        const data = await response.json();
        return data.balance || 0;
      } catch {
        return 0;
      }
    },

    async credit(agentId: string, amount: number): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/api/agent/${agentId}/wallet/credit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, amount }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    async debit(agentId: string, amount: number): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/api/agent/${agentId}/wallet/debit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, amount }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}
