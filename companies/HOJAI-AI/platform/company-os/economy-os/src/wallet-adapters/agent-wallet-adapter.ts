/**
 * Agent Wallet Adapter
 *
 * Connects to agent-wallet (agentfin/agent-wallet).
 */

export interface AgentWalletAdapter {
  // Agent wallet type
  walletType: 'agent';
  getBalance(agentId: string): Promise<number>;
  credit(agentId: string, amount: number): Promise<boolean>;
  debit(agentId: string, amount: number): Promise<boolean>;
}

export async function createAgentWalletAdapter(config?: { baseUrl?: string }): Promise<AgentWalletAdapter> {
  const baseUrl = config?.baseUrl || 'http://localhost:4040';

  return {
    walletType: 'agent',
    async getBalance(agentId: string): Promise<number> {
      try {
        const response = await fetch(`${baseUrl}/api/wallet/balance/${agentId}`);
        const data = await response.json();
        return data.balance || 0;
      } catch {
        return 0;
      }
    },
    async credit(agentId: string, amount: number): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/api/wallet/credit`, {
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
        const response = await fetch(`${baseUrl}/api/wallet/debit`, {
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
}</parameter>
