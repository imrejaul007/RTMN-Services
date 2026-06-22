// CorpPerks REZ Integration
// Connects CorpPerks to Wallet, Karma, and Finance

import axios from 'axios';

const WALLET_SERVICE = process.env.WALLET_SERVICE_URL || 'https://rez-wallet-service.onrender.com';
const KARMA_SERVICE = process.env.KARMA_SERVICE_URL || 'https://rez-karma-loyalty.onrender.com';

export class ReZIntegration {

  // Distribute coins to employee from corporate pool
  async distributeCoins(employeeId: string, amount: number, source: string) {
    return axios.post(`${WALLET_SERVICE}/internal/credit`, {
      userId: employeeId,
      amount,
      coinType: 'rez',
      source: `corpperks_${source}`,
      metadata: { corporateBenefit: true }
    });
  }

  // Award karma for social impact activities
  async awardKarma(employeeId: string, points: number, category: string) {
    return axios.post(`${KARMA_SERVICE}/internal/award`, {
      userId: employeeId,
      karmaPoints: points,
      category, // environment, health, education, community
      source: 'corporate_csr'
    });
  }

  // Get employee balance from wallet
  async getEmployeeBalance(employeeId: string) {
    return axios.get(`${WALLET_SERVICE}/wallet/${employeeId}/balance`);
  }
}
