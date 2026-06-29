/**
 * Cross-Wallet Adapter
 *
 * Connects to REZ-cross-wallet-identity
 * for unified wallet management across providers.
 */

export interface CrossWalletAdapter {
  walletType: 'cross_wallet';
  linkWallets(sourceWalletId: string, targetWalletId: string): Promise<boolean>;
  getAggregatedBalance(walletIds: string[]): Promise<number>;
  transferBetweenWallets(from: string, to: string, amount: number): Promise<boolean>;
  getWalletProvider(walletId: string): Promise<string>;
}

export async function createCrossWalletAdapter(config?: { baseUrl?: string }): Promise<CrossWalletAdapter> {
  const baseUrl = config?.baseUrl || 'http://localhost:4005';

  return {
    walletType: 'cross_wallet',

    async linkWallets(sourceWalletId: string, targetWalletId: string): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/api/wallets/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceWalletId, targetWalletId }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    async getAggregatedBalance(walletIds: string[]): Promise<number> {
      try {
        const response = await fetch(`${baseUrl}/api/wallets/aggregate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletIds }),
        });
        const data = await response.json();
        return data.totalBalance || 0;
      } catch {
        return 0;
      }
    },

    async transferBetweenWallets(from: string, to: string, amount: number): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/api/wallets/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromWalletId: from, toWalletId: to, amount }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    async getWalletProvider(walletId: string): Promise<string> {
      try {
        const response = await fetch(`${baseUrl}/api/wallets/${walletId}/provider`);
        const data = await response.json();
        return data.provider || 'unknown';
      } catch {
        return 'unknown';
      }
    },
  };
}
