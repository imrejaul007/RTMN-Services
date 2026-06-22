/**
 * Client Service
 * Business logic for client management
 */

import { v4 as uuidv4 } from 'uuid';

export interface Client {
  clientId: string;
  name: string;
  email: string;
  phone?: string;
  type: 'individual' | 'corporate' | 'government';
  company?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  gstin?: string;
  pan?: string;
  status: 'active' | 'inactive' | 'prospect';
  cases: string[];
  invoices: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export class ClientService {
  private clients: Map<string, Client> = new Map();

  async createClient(input: Partial<Client>): Promise<Client> {
    const clientId = uuidv4();
    const now = new Date().toISOString();

    const newClient: Client = {
      clientId,
      name: input.name || '',
      email: input.email || '',
      phone: input.phone,
      type: input.type || 'individual',
      company: input.company,
      address: input.address,
      gstin: input.gstin,
      pan: input.pan,
      status: 'active',
      cases: [],
      invoices: [],
      notes: input.notes,
      createdAt: now,
      updatedAt: now
    };

    this.clients.set(clientId, newClient);
    return newClient;
  }

  async getClient(clientId: string): Promise<Client | null> {
    return this.clients.get(clientId) || null;
  }

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client | null> {
    const existingClient = this.clients.get(clientId);
    if (!existingClient) return null;

    const updatedClient: Client = {
      ...existingClient,
      ...updates,
      clientId: existingClient.clientId,
      updatedAt: new Date().toISOString()
    };

    this.clients.set(clientId, updatedClient);
    return updatedClient;
  }

  async linkCase(clientId: string, caseId: string): Promise<Client | null> {
    const client = this.clients.get(clientId);
    if (!client) return null;

    if (!client.cases.includes(caseId)) {
      client.cases.push(caseId);
      client.updatedAt = new Date().toISOString();
      this.clients.set(clientId, client);
    }

    return client;
  }

  async searchClients(query: string): Promise<Client[]> {
    const results: Client[] = [];
    const lowerQuery = query.toLowerCase();

    this.clients.forEach(client => {
      if (
        client.name.toLowerCase().includes(lowerQuery) ||
        client.email.toLowerCase().includes(lowerQuery) ||
        client.company?.toLowerCase().includes(lowerQuery)
      ) {
        results.push(client);
      }
    });

    return results;
  }

  async getClientStats(): Promise<any> {
    let totalClients = 0;
    let activeClients = 0;
    let corporateClients = 0;

    this.clients.forEach(client => {
      totalClients++;
      if (client.status === 'active') activeClients++;
      if (client.type === 'corporate') corporateClients++;
    });

    return {
      totalClients,
      activeClients,
      corporateClients,
      individualClients: totalClients - corporateClients
    };
  }
}

export default ClientService;
