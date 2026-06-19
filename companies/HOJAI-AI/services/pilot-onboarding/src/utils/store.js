// In-memory store with optional Mongo fallback.
// Keeps the service runnable without any external DB for the pilot.
import { v4 as uuidv4 } from 'uuid';
import logger from './logger.js';

const memory = {
  clients: new Map(),
  verificationTokens: new Map(),
  selections: new Map(),
  payments: new Map()
};

export const store = {
  // Clients
  async createClient({ email, passwordHash, companyName, contactName, phone }) {
    const id = uuidv4();
    const client = {
      id,
      email: email.toLowerCase(),
      passwordHash,
      companyName,
      contactName,
      phone: phone || null,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      verifiedAt: null,
      services: []
    };
    memory.clients.set(id, client);
    return client;
  },
  async getClientByEmail(email) {
    for (const c of memory.clients.values()) {
      if (c.email === email.toLowerCase()) return c;
    }
    return null;
  },
  async getClientById(id) {
    return memory.clients.get(id) || null;
  },
  async verifyClient(id) {
    const c = memory.clients.get(id);
    if (!c) return null;
    c.status = 'active';
    c.verifiedAt = new Date().toISOString();
    return c;
  },
  // Verification tokens
  async saveVerificationToken({ clientId, token, expiresAt }) {
    memory.verificationTokens.set(token, { clientId, expiresAt });
  },
  async consumeVerificationToken(token) {
    const rec = memory.verificationTokens.get(token);
    if (!rec) return null;
    memory.verificationTokens.delete(token);
    if (new Date(rec.expiresAt) < new Date()) return null;
    return rec;
  },
  // Service selections
  async addServiceToClient(clientId, selection) {
    const c = memory.clients.get(clientId);
    if (!c) return null;
    c.services.push(selection);
    return c;
  },
  // Payments
  async recordPayment(payment) {
    memory.payments.set(payment.id, payment);
    return payment;
  },
  async getPayment(id) {
    return memory.payments.get(id) || null;
  },
  async listPaymentsForClient(clientId) {
    return [...memory.payments.values()].filter(p => p.clientId === clientId);
  },
  // Stats
  stats() {
    return {
      clients: memory.clients.size,
      pendingVerification: [...memory.clients.values()].filter(c => c.status === 'pending_verification').length,
      active: [...memory.clients.values()].filter(c => c.status === 'active').length,
      servicesProvisioned: [...memory.clients.values()].reduce((sum, c) => sum + c.services.length, 0),
      payments: memory.payments.size
    };
  }
};

logger.info('In-memory store initialized');
export default store;
