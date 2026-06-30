/**
 * Nexha Warehouse Network Client
 *
 * Wraps nexha-warehouse-network: warehouses, slot booking, bins,
 * stock management, transfers, pick lists.
 */
import { request } from './utils.js';
export class WarehouseClient {
    config;
    constructor(config) {
        this.config = config;
    }
    // ── Warehouses ────────────────────────────────────────────
    async listWarehouses(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/warehouses?${params.toString()}`);
    }
    async getWarehouse(id) {
        return request(this.config, 'GET', `/api/v1/warehouses/${encodeURIComponent(id)}`);
    }
    async listSlots(warehouseId, input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/warehouses/${encodeURIComponent(warehouseId)}/slots?${params.toString()}`);
    }
    // ── Bookings ──────────────────────────────────────────────
    async createBooking(input) {
        return request(this.config, 'POST', '/api/v1/bookings', input);
    }
    async cancelBooking(id) {
        return request(this.config, 'DELETE', `/api/v1/bookings/${encodeURIComponent(id)}`);
    }
    async listBookings(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/bookings?${params.toString()}`);
    }
    // ── Bins & Stock ─���────────────────────────────────────────
    async listBins(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/bins?${params.toString()}`);
    }
    async getBin(id) {
        return request(this.config, 'GET', `/api/v1/bins/${encodeURIComponent(id)}`);
    }
    async listStock(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/stock?${params.toString()}`);
    }
    async receiveStock(input) {
        return request(this.config, 'POST', '/api/v1/stock/receive', input);
    }
    async adjustStock(input) {
        return request(this.config, 'POST', '/api/v1/stock/adjust', input);
    }
    // ── Transfers ─────────────────────────────────────────────
    async createTransfer(input) {
        return request(this.config, 'POST', '/api/v1/transfers', input);
    }
    async pickTransfer(id) {
        return request(this.config, 'POST', `/api/v1/transfers/${encodeURIComponent(id)}/pick`);
    }
    async receiveTransfer(id, input) {
        return request(this.config, 'POST', `/api/v1/transfers/${encodeURIComponent(id)}/receive`, input);
    }
    async cancelTransfer(id) {
        return request(this.config, 'POST', `/api/v1/transfers/${encodeURIComponent(id)}/cancel`);
    }
    async getTransfer(id) {
        return request(this.config, 'GET', `/api/v1/transfers/${encodeURIComponent(id)}`);
    }
    // ── Pick Lists ────────────────────────────────────────────
    async createPickList(input) {
        return request(this.config, 'POST', '/api/v1/picklists', input);
    }
    async pickFromList(id, input) {
        return request(this.config, 'POST', `/api/v1/picklists/${encodeURIComponent(id)}/pick`, input);
    }
}
//# sourceMappingURL=warehouse.js.map