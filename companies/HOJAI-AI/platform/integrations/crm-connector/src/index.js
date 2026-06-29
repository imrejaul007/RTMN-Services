/**
 * HOJAI CRM Connector
 * Unified CRM for HubSpot + Salesforce
 */

const axios = require('axios');
const crypto = require('crypto');

class CRMConnector {
  constructor(config) {
    this.config = config;
    this.provider = config.provider || 'hubspot'; // hubspot | salesforce
    this.accessToken = config.accessToken;
    this.instanceUrl = config.instanceUrl;
  }

  // ===== HUBSPOT METHODS =====

  async createContact(data) {
    if (this.provider !== 'hubspot') throw new Error('Wrong provider');

    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        properties: {
          email: data.email,
          firstname: data.firstName,
          lastname: data.lastName,
          phone: data.phone,
          company: data.company,
          jobtitle: data.jobTitle,
          ...data.customFields,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async updateContact(email, data) {
    const contact = await this.getContact(email);
    if (!contact) throw new Error('Contact not found');

    const response = await axios.patch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`,
      { properties: data },
      { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
    );

    return response.data;
  }

  async getContact(email) {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        filterGroups: [{
          filters: [{ propertyName: 'email', operator: 'EQ', value: email }],
        properties: ['email', 'firstname', 'lastname', 'phone', 'company', 'lifecyclestage', 'hs_lead_status'],
      },
      { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
    );

    return response.data.results?.[0];
  }

  async listContacts(params = {}) {
    const { limit = 20, after, properties } = params;

    const response = await axios.get(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        params: { limit, after, properties: properties?.join(',') },
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      }
    );

    return response.data;
  }

  // ===== DEALS =====

  async createDeal(data) {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/deals',
      {
        properties: {
          dealname: data.name,
          amount: data.amount,
          dealstage: data.stage || 'appointmentscheduled',
          closedate: data.closeDate,
          pipeline: data.pipeline || 'default',
          ...data.customFields,
        },
      },
      { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
    );

    return response.data;
  }

  async updateDealStage(dealId, stage) {
    const response = await axios.patch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      { properties: { dealstage: stage } },
      { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
    );

    return response.data;
  }

  async associateDealContact(dealId, contactId) {
    await axios.put(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/contact/${contactId}/deal_to_contact`,
      [],
      { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' }
    );

    return { success: true };
  }

  // ===== PIPELINES =====

  async getPipeline() {
    const response = await axios.get(
      'https://api.hubapi.com/crm/v3/pipelines/deals',
      { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
    );

    return response.data.results?.[0]?.stages || [];
  }

  async getPipelineStats() {
    const deals = await axios.get(
      'https://api.hubapi.com/crm/v3/objects/deals',
      {
        params: { limit: 100 },
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      }
    );

    const stages = { 'appointmentscheduled': 0, 'qualifiedtobuy': 0, 'presentationscheduled': 0, 'decisionmakerboughtin': 0, 'contractsent': 0, 'closedwon': 0, 'closedlost': 0 };

    deals.data.results?.forEach(d => {
      const stage = d.properties.dealstage;
      if (stages[stage] !== undefined) stages[stage]++;
    });

    return stages;
  }

  // ===== QUICK STATS =====

  async getStats() {
    const [contacts, deals, activities] = await Promise.all([
      axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        params: { limit: 1 },
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      }),
      axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
        params: { limit: 1 },
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      }),
      axios.get('https://api.hubapi.com/crm/v3/objects/notes', {
        params: { limit: 1 },
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      }),
    ]);

    return {
      contacts: contacts.headers['harry-total'] || 0,
      deals: deals.headers['harry-total'] || 0,
      activities: activities.headers['harry-total'] || 0,
    };
  }

  // ===== UNIFIED API =====

  // Sync leads from webhook/import
  async syncLead(data) {
    // Find or create contact
    let contact = await this.getContact(data.email);

    if (!contact) {
      contact = await this.createContact(data);
    }

    // Create deal if company info provided
    if (data.company) {
      const deal = await this.createDeal({
        name: `${data.name} - ${data.company}`,
        amount: data.dealValue,
        stage: 'appointmentscheduled',
      });

      await this.associateDealContact(deal.id, contact.id);
    }

    return { contact, deal };
  }

  // Enrich lead with intelligence
  async enrichLead(email) {
    const contact = await this.getContact(email);
    if (!contact) return null;

    return {
      id: contact.id,
      email: contact.properties.email,
      name: `${contact.properties.firstname} ${contact.properties.lastname}`,
      company: contact.properties.company,
      lifecycleStage: contact.properties.lifecyclestage,
      leadStatus: contact.properties.hs_lead_status,
      lastActivity: contact.properties.lastmodifieddate,
    };
  }
}

module.exports = CRMConnector;
