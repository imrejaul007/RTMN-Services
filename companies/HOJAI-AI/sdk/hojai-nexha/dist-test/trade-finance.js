/**
 * Nexha Trade Finance Network Client
 *
 * Wraps nexha-trade-finance-network: business entities, credit offers,
 * loans, repayments, disputes, FX quotes.
 */
import { request } from './utils.js';
export class TradeFinanceClient {
    config;
    constructor(config) {
        this.config = config;
    }
    // ── Entities ──────────────────────────────────────────────
    async registerEntity(input) {
        return request(this.config, 'POST', '/api/v1/entities', input);
    }
    async getEntity(id) {
        return request(this.config, 'GET', `/api/v1/entities/${encodeURIComponent(id)}`);
    }
    // ── Credit Offers ─────────────────────────────────────────
    async createCreditOffer(input) {
        return request(this.config, 'POST', '/api/v1/credit-offers', input);
    }
    async listCreditOffers(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/credit-offers?${params.toString()}`);
    }
    async getCreditOffer(id) {
        return request(this.config, 'GET', `/api/v1/credit-offers/${encodeURIComponent(id)}`);
    }
    // ── Loans ─────────────────────────────────────────────────
    async createLoan(input) {
        return request(this.config, 'POST', '/api/v1/loans', input);
    }
    async disburseLoan(id, offerId) {
        return request(this.config, 'POST', `/api/v1/loans/${encodeURIComponent(id)}/disburse`, { offerId });
    }
    async listLoans(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/loans?${params.toString()}`);
    }
    async getLoan(id) {
        return request(this.config, 'GET', `/api/v1/loans/${encodeURIComponent(id)}`);
    }
    async repayLoan(id, input) {
        return request(this.config, 'POST', `/api/v1/loans/${encodeURIComponent(id)}/repay`, input);
    }
    async listRepayments(loanId) {
        return request(this.config, 'GET', `/api/v1/loans/${encodeURIComponent(loanId)}/repayments`);
    }
    // ── Disputes ──────────────────────────────────────────────
    async openDispute(input) {
        return request(this.config, 'POST', '/api/v1/disputes', input);
    }
    async resolveDispute(id, input) {
        return request(this.config, 'POST', `/api/v1/disputes/${encodeURIComponent(id)}/resolve`, input);
    }
    async listDisputes(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/disputes?${params.toString()}`);
    }
    // ── FX ────────────────────────────────────────────────────
    async fxQuote(input) {
        return request(this.config, 'POST', '/api/v1/fx/quote', input);
    }
}
//# sourceMappingURL=trade-finance.js.map