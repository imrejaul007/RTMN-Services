import { BaseClient, HojaiConfig } from '../base.js';

// AI Economy OS — Port 4894
export class AIEconomyClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4894' }); }

  async listListings(params?: { type?: string; status?: string }) { return this.get<any>('/listings', params); }
  async getListing(id: string) { return this.get<any>(`/listings/${id}`); }
  async createListing(data: { name: string; type: string; price: number; description?: string; tags?: string[] }) { return this.post<any>('/listings', data); }
  async updateListing(id: string, data: Record<string, unknown>) { return this.put<any>(`/listings/${id}`, data); }
  async deleteListing(id: string) { return this.delete<any>(`/listings/${id}`); }

  async purchase(listingId: string, buyerId: string) { return this.post<any>('/transactions/purchase', { listingId, buyerId }); }
  async getTransactions(params?: { buyerId?: string; sellerId?: string }) { return this.get<any>('/transactions', params); }
  async getTransaction(id: string) { return this.get<any>(`/transactions/${id}`); }

  async getWallet(ownerId: string) { return this.get<any>(`/wallets/${ownerId}`); }
  async topupWallet(ownerId: string, amount: number) { return this.post<any>(`/wallets/${ownerId}/topup`, { amount }); }
  async getWalletTransactions(ownerId: string) { return this.get<any>(`/wallets/${ownerId}/transactions`); }

  async setPrice(listingId: string, price: number) { return this.post<any>(`/listings/${listingId}/price`, { price }); }
  async getPricingHistory(listingId: string) { return this.get<any>(`/listings/${listingId}/pricing-history`); }
  async getAnalytics() { return this.get<any>('/analytics'); }
}